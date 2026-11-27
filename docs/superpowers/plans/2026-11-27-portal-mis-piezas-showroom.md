# Portal · "Mis Piezas" (showroom) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al cliente del portal una sección "Mis Piezas" para ver sus piezas publicadas y compartirlas (hoja nativa con el `.mp4`) o descargar el archivo.

**Architecture:** Reusa el pipeline de datos del calendario (`getMyCalendarPieces` sobre `scheduled_posts`, RLS por cliente). La lógica pura (selección, veto del proxy, disponibilidad, decisión de compartir) vive en `src/lib/*` con tests `node:test`; los endpoints serverless (`api/*`) son wrappers finos sobre esa lógica + `requireMember`/`serviceClient`/`applyPortalCors`. La descarga y el compartir-archivo pasan por un proxy en Vercel que valida pertenencia y hace stream del media de R2. La desaparición al purgar se logra con un chequeo de vida (`HEAD`) server-side.

**Tech Stack:** Vite + React + TypeScript (portal), funciones serverless Vercel (Node), Supabase (auth + datos), R2 (media público). Tests: `node --import tsx --test src/lib/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-27-portal-mis-piezas-showroom-design.md`

## Global Constraints

- Chrome-only CreAPP: no se tocan motion-graphics; acentos por tema del cliente (igual que calendario/insights).
- Solo lectura: no edita, re-renderiza ni re-publica. No toca el flujo de revisión.
- Solo piezas `status === 'published'` **y** `mediaUrls.length > 0` **y** con archivo vivo en R2.
- Scope = campaña del switcher: `campaignId = live ? null : campaign.id`.
- El runner de tests solo levanta `src/lib/*.test.ts`: toda lógica testeable va en `src/lib/` y es pura (sin DOM, sin `supabaseClient`), con dependencias inyectadas.
- Endpoints autorizados: patrón `applyPortalCors` (preflight OPTIONS) + `requireMember(req)` → `{ clients: [{ id, slug }] }` + `serviceClient`. Sin env nuevas (la URL de R2 es pública; el server solo la proxea/`HEAD`-ea).
- "Publicado" se define como `status === 'published'` (igual que `calendarMapper`).

## Review Focus

- Miembro de otro cliente pide descargar una pieza ajena → **403** (Task 2).
- Pieza con media purgado de R2 (`HEAD`/`GET` da 404) → no se muestra en el showroom; si se coló, el proxy responde 404 "no disponible", no error (Task 3, Task 5).
- Pieza publicada sin `media_r2_urls` → no aparece y el proxy da 404 (Task 1, Task 2).
- iOS Safari: `navigator.share({ files })` rechaza con `NotAllowedError` → cae a compartir link y luego a menú propio (Task 4).
- Compu sin `navigator.share` → menú propio, el botón nunca queda muerto (Task 4).

---

### Task 1: Selector de piezas del showroom (`showroomSelect.ts`)

**Files:**
- Create: `src/lib/showroomSelect.ts`
- Test: `src/lib/showroomSelect.test.ts`

**Interfaces:**
- Consumes: `CalendarPiece` de `./calendarTypes`.
- Produces: `selectPublishedPieces(pieces: CalendarPiece[]): CalendarPiece[]` — devuelve solo `published === true && mediaUrls.length > 0`, ordenadas por `date` descendente (sin fecha al final).

- [ ] **Step 1: Write the failing test** (`src/lib/showroomSelect.test.ts`, estilo `node:test` + `assert/strict`)

```ts
test('selectPublishedPieces: solo publicadas con media, más nuevas primero', () => {
  const mk = (id, published, media, date) => ({ id, jobIdMotor:'j', campaignId:'c', type:'reel',
    platform:'instagram_reel', coverUrl:null, mediaUrls:media, caption:null, permalink:null,
    published, date: date ? new Date(date) : null });
  const out = selectPublishedPieces([
    mk('old', true, ['u'], '2026-11-01T12:00:00Z'),
    mk('future', false, ['u'], '2026-12-01T12:00:00Z'),
    mk('nomedia', true, [], '2026-11-15T12:00:00Z'),
    mk('new', true, ['u'], '2026-11-20T12:00:00Z'),
  ]);
  assert.deepEqual(out.map(p => p.id), ['new', 'old']);
});
```

- [ ] **Step 2: Run test, verify it fails** — `npm test` → FAIL ("selectPublishedPieces is not a function").
- [ ] **Step 3: Implement `selectPublishedPieces`** en `src/lib/showroomSelect.ts` (filtro + sort desc por `date.getTime()`, `null` al final).
- [ ] **Step 4: Run test, verify it passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(portal): selector de piezas publicadas del showroom`.

---

### Task 2: Lógica de autorización del proxy (`downloadProxy.ts`)

**Files:**
- Create: `src/lib/downloadProxy.ts`
- Test: `src/lib/downloadProxy.test.ts`

**Interfaces:**
- Produces:
  - `type ProxyRow = { client_id: string; status: string; media_r2_urls: string[] | null }`
  - `authorizePiece(row: ProxyRow | null, memberSlugs: string[]): { ok: true } | { ok: false; status: 403 | 404 }` — `!row` → 404; `client_id` no ∈ `memberSlugs` → 403; `status !== 'published'` → 404; si no, `{ ok: true }`.
  - `pickMediaUrl(row: ProxyRow, index: number): string | null` — `media_r2_urls?.[index] ?? null`.
  - `safeFilename(opts: { brand: string; type: string; date: string | null; url: string }): string` — `<slug-brand>-<type>-<YYYY-MM-DD|'pieza'>.<ext-de-url>`; solo `[a-z0-9-]`, extensión tomada del path de `url` (default `mp4`).

- [ ] **Step 1: Write the failing tests**

```ts
test('authorizePiece: ajeno 403, no-publicada 404, inexistente 404, propia-publicada ok', () => {
  const row = (c, s) => ({ client_id:c, status:s, media_r2_urls:['u'] });
  assert.deepEqual(authorizePiece(null, ['a']), { ok:false, status:404 });
  assert.deepEqual(authorizePiece(row('b','published'), ['a']), { ok:false, status:403 });
  assert.deepEqual(authorizePiece(row('a','scheduled'), ['a']), { ok:false, status:404 });
  assert.deepEqual(authorizePiece(row('a','published'), ['a']), { ok:true });
});
test('pickMediaUrl y safeFilename', () => {
  assert.equal(pickMediaUrl({ client_id:'a', status:'published', media_r2_urls:['x','y'] }, 1), 'y');
  assert.equal(pickMediaUrl({ client_id:'a', status:'published', media_r2_urls:null }, 0), null);
  assert.equal(
    safeFilename({ brand:'Cardoso Propiedades', type:'reel', date:'2026-11-20T12:00:00Z', url:'https://r2/x/final.mp4' }),
    'cardoso-propiedades-reel-2026-11-20.mp4');
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.
- [ ] **Step 3: Implement** `authorizePiece`, `pickMediaUrl`, `safeFilename` en `src/lib/downloadProxy.ts` (puro, sin IO).
- [ ] **Step 4: Run tests, verify they pass** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(portal): autorización y nombre de archivo del proxy de descarga`.

---

### Task 3: Disponibilidad de media en R2 (`pieceAvailability.ts`)

**Files:**
- Create: `src/lib/pieceAvailability.ts`
- Test: `src/lib/pieceAvailability.test.ts`

**Interfaces:**
- Produces: `buildAvailabilityMap(urlById: Record<string, string | null>, head: (url: string) => Promise<boolean>): Promise<Record<string, boolean>>` — por cada id: `false` si url vacía; si no, `await head(url)`. `head` inyectable (en el endpoint hará `fetch(url, { method:'HEAD' })` → `res.ok`).

- [ ] **Step 1: Write the failing test**

```ts
test('buildAvailabilityMap: url vacía=false; head decide el resto', async () => {
  const head = async (u) => u === 'live';
  const out = await buildAvailabilityMap({ a:'live', b:'dead', c:null }, head);
  assert.deepEqual(out, { a:true, b:false, c:false });
});
```

- [ ] **Step 2: Run test, verify it fails** — `npm test` → FAIL.
- [ ] **Step 3: Implement `buildAvailabilityMap`** en `src/lib/pieceAvailability.ts` (`Promise.all` sobre las entradas).
- [ ] **Step 4: Run test, verify it passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(portal): chequeo de disponibilidad de media en R2`.

---

### Task 4: Decisión de compartir (`sharePiece.ts`)

**Files:**
- Create: `src/lib/sharePiece.ts`
- Test: `src/lib/sharePiece.test.ts`

**Interfaces:**
- Produces:
  - `type ShareCaps = { canShareFiles: (file: File) => boolean; canShareUrl: boolean }`
  - `type ShareMode = 'file' | 'link' | 'menu'`
  - `planShare(opts: { file: File | null; permalink: string | null; caps: ShareCaps }): ShareMode` — `file && caps.canShareFiles(file)` → `'file'`; si no, `permalink && caps.canShareUrl` → `'link'`; si no, `'menu'`.
  - `nextFallback(mode: ShareMode): ShareMode | null` — `'file'`→`'link'`, `'link'`→`'menu'`, `'menu'`→`null`. (El ejecutor en el componente usa esta cadena ante un `NotAllowedError` de `navigator.share`.)

- [ ] **Step 1: Write the failing tests**

```ts
const F = {} as unknown as File;
test('planShare elige archivo, luego link, luego menú', () => {
  assert.equal(planShare({ file:F, permalink:'p', caps:{ canShareFiles:()=>true, canShareUrl:true } }), 'file');
  assert.equal(planShare({ file:F, permalink:'p', caps:{ canShareFiles:()=>false, canShareUrl:true } }), 'link');
  assert.equal(planShare({ file:null, permalink:null, caps:{ canShareFiles:()=>false, canShareUrl:false } }), 'menu');
});
test('nextFallback: file→link→menu→null', () => {
  assert.equal(nextFallback('file'), 'link');
  assert.equal(nextFallback('link'), 'menu');
  assert.equal(nextFallback('menu'), null);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.
- [ ] **Step 3: Implement `planShare` y `nextFallback`** en `src/lib/sharePiece.ts` (puro).
- [ ] **Step 4: Run tests, verify they pass** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(portal): decisión y fallback de compartir`.

---

### Task 5: Endpoints serverless (proxy de descarga + disponibilidad)

**Files:**
- Modify (rewrite): `api/download-video.js`
- Create: `api/portal/pieces-availability.js`

**Interfaces:**
- Consumes: `authorizePiece`, `pickMediaUrl`, `safeFilename` (Task 2); `buildAvailabilityMap` (Task 3); `requireMember` (`api/_lib/requireMember.js`), `serviceClient` (`api/_lib/serviceClient.js`), `applyPortalCors` (`api/_lib/portalCors.js`).
- Produces (contratos que consume el browser en Task 6):
  - `GET /api/download-video?post=<scheduled_posts.id>&i=<index=0>` → stream del media con `Content-Type` upstream + `Content-Disposition: attachment; filename="..."`. Errores: 401/403/404 JSON. R2 404/410 → 404 `{ error:'no disponible' }`.
  - `GET /api/portal/pieces-availability?post=<id,id,...>` → `{ available: { [postId]: boolean } }`.

**Nota:** el runner no cubre `api/*`; estos son wrappers finos sobre lógica ya testeada (Tasks 2–3). Verificación = `npm run build` (typecheck) + chequeo manual descrito abajo.

- [ ] **Step 1: Rewrite `api/download-video.js`** — `applyPortalCors` (OPTIONS→200); `requireMember` (catch → status del error); `serviceClient().from('scheduled_posts').select('client_id,status,media_r2_urls,platform,scheduled_at').eq('id', post).maybeSingle()`; `authorizePiece({ client_id, status, media_r2_urls }, member.clients.map(c=>c.slug))` → si `!ok`, responde su `status`; `pickMediaUrl` → si null, 404; `fetch(url)` server-side → si `!res.ok`, 404 `{error:'no disponible'}`; si ok, setea `Content-Type` del upstream y `Content-Disposition` con `safeFilename({ brand: row.client_id, type: deriveType(row.platform), date: row.scheduled_at, url })` (importar `deriveType` de `../src/lib/calendarMapper.js`), y hace stream del body.
- [ ] **Step 2: Create `api/portal/pieces-availability.js`** — `applyPortalCors`; `requireMember`; parsea `post` (lista); `serviceClient` lee `id, client_id, status, media_r2_urls` de esos ids; descarta los que no pertenecen al miembro o no están publicados; arma `urlById` con `media_r2_urls[0]`; `buildAvailabilityMap(urlById, u => fetch(u,{method:'HEAD'}).then(r=>r.ok).catch(()=>false))`; responde `{ available }`. (Caché corta opcional en memoria del handler.)
- [ ] **Step 3: Verify build** — `npm run build` → sin errores de tipos.
- [ ] **Step 4: Manual check (documentar, no bloqueante en CI)** — con la app corriendo, un `GET /api/download-video?post=<id-ajeno>` con Bearer de otro cliente devuelve 403; con `post` propio publicado baja el `.mp4`; `pieces-availability` devuelve `false` para un id cuyo objeto R2 se borró.
- [ ] **Step 5: Commit** — `feat(portal): proxy de descarga + endpoint de disponibilidad`.

---

### Task 6: Servicio del showroom en el browser (`showroomService.ts`)

**Files:**
- Create: `src/lib/showroomService.ts`

**Interfaces:**
- Consumes: `getMyCalendarPieces`, `subscribeMyCalendar` (`./calendarService`); `selectPublishedPieces` (Task 1); `getSupabase` (`./supabaseClient`); contratos de endpoints (Task 5).
- Produces:
  - `getMyShowroomPieces(campaignId: string | null): Promise<CalendarPiece[]>` — `getMyCalendarPieces` → `selectPublishedPieces` → consulta `/api/portal/pieces-availability` (Bearer, patrón `insightsService`) y filtra las no disponibles.
  - `fetchPieceBlob(postId: string, index?: number): Promise<Blob>` — `fetch('/api/download-video?post=&i=', { headers:{ Authorization: Bearer } })`; `!ok` → throw con el `error`.
  - `downloadBlob(blob: Blob, filename: string): void` — `createObjectURL` → `<a download>` → click → `revokeObjectURL`.
  - re-export `subscribeMyCalendar` como `subscribeMyShowroom`.

**Nota:** glue de IO/browser, sin test unitario (depende de `fetch`/DOM/Supabase); se apoya en los módulos puros ya testeados. Verificación = `npm run build`.

- [ ] **Step 1: Implement `showroomService.ts`** con las firmas de arriba (Bearer vía `getSupabase().auth.getSession()`, igual que `insightsService`).
- [ ] **Step 2: Verify build** — `npm run build` → OK.
- [ ] **Step 3: Commit** — `feat(portal): servicio del showroom (datos + descarga)`.

---

### Task 7: Sección "Mis Piezas" (UI) + nav + wiring

**Files:**
- Create: `src/components/portal/MisPiezas.tsx`
- Modify: `src/components/portal/PortalShell.tsx` (union `PortalSection` + array `NAV`)
- Modify: `src/pages/PortalView.tsx` (branch de render)
- Modify: `src/components/portal/portal.css` (estilos de grilla + detalle + acciones)

**Interfaces:**
- Consumes: `getMyShowroomPieces`, `subscribeMyShowroom`, `fetchPieceBlob`, `downloadBlob` (Task 6); `planShare`, `nextFallback` (Task 4); `PortalVideo` (reel/story). Carrusel: visor inline simple (img + prev/next, patrón de `PiecePlayer`, **no** el componente `PiecePlayer` que está acoplado a revisión).
- Produces: `MisPiezas: React.FC<{ campaignId: string | null }>`.

- [ ] **Step 1: PortalShell** — agregar `'piezas'` al tipo `PortalSection`; sumar `{ id:'piezas', label:'Mis Piezas', icon: Clapperboard }` (lucide) al `NAV`, siempre visible (también en `hideReview`/live).
- [ ] **Step 2: MisPiezas.tsx** — estado de carga/vacío ("Todavía no publicamos piezas…"); grilla de tarjetas (cover 9:16 con fallback a placeholder si el cover está roto, tipo + fecha); al tocar, detalle con `PortalVideo` (reel/story) o visor de slides (carrusel) + barra **Compartir** / **Descargar**. Realtime: `subscribeMyShowroom(reload)`.
  - **Descargar:** `fetchPieceBlob` → `downloadBlob(blob, filename)` (nombre lo trae el header; derivar del `Content-Disposition` o recomponer cliente-side).
  - **Compartir:** en celular precargar el blob al abrir el detalle (spinner chico); al tocar, `planShare({ file, permalink, caps })`; ejecutar el modo; si `navigator.share` lanza `NotAllowedError`/aborta, pasar a `nextFallback(mode)` hasta `'menu'` (copiar link, WhatsApp `wa.me/?text=`, descargar). Carrusel → arrancar en `'link'`.
- [ ] **Step 3: PortalView** — agregar `{section === 'piezas' && <MisPiezas campaignId={live ? null : campaign.id} />}`.
- [ ] **Step 4: portal.css** — estilos de la grilla, detalle y barra de acciones, reusando tokens/acentos de calendario e `PortalHome` (chrome-only).
- [ ] **Step 5: Verify** — `npm test` (todo verde) y `npm run build` (OK). Chequeo visual: abrir el portal como cliente en modo live, ver la grilla, reproducir, descargar y (en móvil) compartir.
- [ ] **Step 6: Commit** — `feat(portal): sección Mis Piezas (showroom + compartir + descargar)`.

---

## Notas de cierre

- **Patrones de motion descubiertos:** ninguno — es trabajo de portal/plumbing, no de construcción de piezas.
- **Proyecto 2 (aparte):** administrador de almacenamiento R2 en la Suite — se brainstormea y planifica por separado.
