# Portal del cliente — Shell + Calendario de campaña — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al portal del cliente un shell con sidebar colapsable (estética CreAPP) y una sección Calendario que muestra la campaña publicada (`scheduled_posts`) en vivo, con blur temporal y player embebido.

**Architecture:** SPA Vite/React. Datos Supabase-directo-bajo-RLS. Una policy RLS nueva deja al cliente leer sus `scheduled_posts` (gateada vía `content_jobs`). Lógica pura (mapper, estado de celda, grilla de mes, TZ) en `src/lib/` con tests `node:test`; servicios de datos + componentes sin unit-test (como `launchesService`), verificados por build + humo.

**Tech Stack:** React 18, react-router-dom, Supabase JS, lucide-react, CSS hand-authored (`portal.css`). Tests: `node --import tsx --test src/lib/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-25-portal-cliente-shell-calendario-design.md`

## Global Constraints

- SPA Vite + react-router. No Next.js, no server components.
- Datos vía `getSupabase()` bajo RLS. Nunca service_role en el cliente.
- Sidebar = chrome CreAPP (gradiente `#b06cff → #ff5ea8`, glows); contenido = tema del cliente (`portalThemes`/`usePortalTheme`). **Nunca recolorear el contenido del cliente con el violeta de CreAPP.**
- CSS nuevo con prefijo `.portal` dentro de `portal.css` (look shadcn, sin sumar la librería shadcn).
- Íconos: `lucide-react` (no emojis).
- Calendario **solo lectura**. No reprograma.
- Tests de lógica viven en `src/lib/*.test.ts` con `node:test` + `node:assert/strict` (único glob que corre).
- Policy RLS **fail-closed** y de mínimo privilegio (disciplina auditoría 2026-11-24).
- `scheduled_posts.client_id` es **slug**; `job_id` es **`content_jobs.job_id_motor`**; `content_assets.job_id` es el **uuid** `content_jobs.id`.

## Review Focus

- **Pieza con hora pasada pero no publicada** (`queued`/`ready`/`error`): debe mostrarse "En proceso", nunca falsa "Publicado". → test en Task 2 (`cellState`).
- **Fila sin `cover_r2_url`/`media_r2_urls`**: fallback a `content_assets`; si tampoco hay, celda abrible con caption y sin media (no rompe). → test en Task 2 (`mapScheduledRows`).
- **TZ cerca de medianoche**: `scheduled_at` UTC debe caer en el **día local AR** correcto (ej. `2026-12-02T02:00:00Z` → 1-dic 23:00 AR). → test en Task 2 (`toLocalDay`).
- **Cliente multi-campaña**: solo ve piezas de la campaña activa; las de otra campaña del mismo cliente no se cuelan. → test en Task 2 (`mapScheduledRows` con `campaignId`).
- **Cliente sin `scheduled_posts`** (campaña no lanzada): empty state honesto, no error. → mapper devuelve `[]` (test Task 2); empty state en Task 4 (humo manual).

---

### Task 1: Migration RLS — lectura de `scheduled_posts` por miembro

**Files:**
- Create: `supabase/migrations/20261125120000_scheduled_posts_member_read.sql`

**Interfaces:**
- Consumes: helper `public.is_member_of(uuid)`, tabla `public.content_jobs(job_id_motor, client_id, client_visible)`.
- Produces: policy SELECT `"Members can read own scheduled_posts"`. Habilita que `calendarService` (Task 3) lea bajo RLS del realm cliente.

- [ ] **Step 1: Escribir la migration** (contenido exacto):

```sql
-- El cliente (realm portal) lee sus scheduled_posts, gateado por content_jobs
-- (client_id uuid + client_visible = true), espejo de content_visibility_rls.
-- No se gatea por scheduled_posts.client_id porque es SLUG, e is_member_of toma uuid.
drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.job_id_motor = scheduled_posts.job_id
        and public.is_member_of(j.client_id)
        and j.client_visible = true
    )
  );

create index if not exists idx_content_jobs_job_id_motor
  on public.content_jobs (job_id_motor);
```

- [ ] **Step 2: Verificar** (manual, SQL Editor de Supabase; no hay test runner de SQL):
  - Aplicar la migration completa.
  - Como **cliente** (sesión del realm portal / `is_member_of` true para su cliente): `select count(*) from scheduled_posts` devuelve solo filas cuyos `content_jobs` son suyos y `client_visible = true`. Filas de otro cliente → 0.
  - Como **equipo** (admin/vendedor): la policy "Team can read scheduled_posts" sigue devolviendo todo (no se tocó).
  - Fila huérfana (sin `content_jobs` match) o con `client_visible = false` → el cliente ve 0 (fail-closed).
  - Dejar registro del chequeo en el PR (patrón auditoría RLS en vivo ya usado en el repo).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261125120000_scheduled_posts_member_read.sql
git commit -m "feat(rls): cliente lee sus scheduled_posts (gate via content_jobs)"
```

---

### Task 2: Lógica pura del calendario — tipos, mapper, estado de celda, grilla

**Files:**
- Create: `src/lib/calendarTypes.ts`
- Create: `src/lib/calendarMapper.ts`
- Test: `src/lib/calendarMapper.test.ts`

**Interfaces:**
- Consumes: nada (lógica pura).
- Produces:
  - `type SchedRowSafe = { id: string; client_id: string; job_id: string; status: string; scheduled_at: string | null; cover_r2_url: string | null; media_r2_urls: string[] | null; caption: string | null; platform: string | null; permalink: string | null; published_media_id: string | null; updated_at: string }`
  - `type CalJobRow = { job_id_motor: string; campaign_id: string; type: string | null; coverUrl: string | null }` (cover de fallback ya resuelto por el service).
  - `type CellState = 'future' | 'published' | 'in_process'`
  - `type CalendarPiece = { id: string; jobIdMotor: string; campaignId: string | null; date: Date | null; type: 'reel' | 'carousel' | 'story'; platform: string | null; coverUrl: string | null; mediaUrls: string[]; caption: string | null; permalink: string | null; published: boolean }`
  - `deriveType(platform: string | null): 'reel' | 'carousel' | 'story'`
  - `toLocalDayKey(iso: string, tz?: string): string` — clave `YYYY-MM-DD` en hora local (default `America/Argentina/Buenos_Aires`).
  - `cellState(piece: CalendarPiece, now: Date): CellState`
  - `mapScheduledRows(rows: SchedRowSafe[], jobs: CalJobRow[], opts: { campaignId?: string | null }): CalendarPiece[]`
  - `monthGrid(year: number, monthIndex0: number): (string | null)[]` — 42 celdas (6×7), `YYYY-MM-DD` o `null`, semana arranca lunes.

- [ ] **Step 1: Escribir los tests** en `src/lib/calendarMapper.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveType, toLocalDayKey, cellState, mapScheduledRows, monthGrid } from './calendarMapper';

test('deriveType mapea plataforma', () => {
  assert.equal(deriveType('instagram_reel'), 'reel');
  assert.equal(deriveType('instagram_carousel'), 'carousel');
  assert.equal(deriveType('instagram_story'), 'story');
  assert.equal(deriveType(null), 'reel'); // default
});

test('toLocalDayKey respeta TZ AR cerca de medianoche', () => {
  // 02:00 UTC = 23:00 del día anterior en AR (UTC-3)
  assert.equal(toLocalDayKey('2026-12-02T02:00:00Z'), '2026-12-01');
  assert.equal(toLocalDayKey('2026-12-02T12:00:00Z'), '2026-12-02');
});

test('cellState: publicado gana; pasado-no-publicado = in_process; futuro = future', () => {
  const now = new Date('2026-12-05T12:00:00Z');
  const base = { id:'x', jobIdMotor:'j', campaignId:'c', type:'reel', platform:'instagram_reel', coverUrl:null, mediaUrls:[], caption:null, permalink:null } as const;
  assert.equal(cellState({ ...base, date: new Date('2026-12-10T12:00:00Z'), published:false }, now), 'future');
  assert.equal(cellState({ ...base, date: new Date('2026-12-01T12:00:00Z'), published:true }, now), 'published');
  // pasó su hora pero NO se publicó → honesto, no "published"
  assert.equal(cellState({ ...base, date: new Date('2026-12-01T12:00:00Z'), published:false }, now), 'in_process');
});

test('mapScheduledRows: scopea a la campaña activa y resuelve media con fallback', () => {
  const rows = [
    { id:'a', client_id:'cli', job_id:'m1', status:'published', scheduled_at:'2026-12-02T14:00:00Z', cover_r2_url:'cov1', media_r2_urls:['mp4'], caption:'hola', platform:'instagram_reel', permalink:'http://ig/a', published_media_id:'ig1', updated_at:'' },
    { id:'b', client_id:'cli', job_id:'m2', status:'queued',    scheduled_at:'2026-12-03T14:00:00Z', cover_r2_url:null,  media_r2_urls:null,  caption:null,  platform:'instagram_carousel', permalink:null, published_media_id:null, updated_at:'' },
    { id:'c', client_id:'cli', job_id:'m3', status:'queued',    scheduled_at:'2026-12-04T14:00:00Z', cover_r2_url:'cov3', media_r2_urls:['s1','s2'], caption:null, platform:'instagram_carousel', permalink:null, published_media_id:null, updated_at:'' },
  ];
  const jobs = [
    { job_id_motor:'m1', campaign_id:'C1', type:'reel', coverUrl:null },
    { job_id_motor:'m2', campaign_id:'C1', type:'carousel', coverUrl:'assetCov2' }, // fallback cover
    { job_id_motor:'m3', campaign_id:'C2', type:'carousel', coverUrl:null },        // otra campaña
  ];
  const out = mapScheduledRows(rows as any, jobs as any, { campaignId: 'C1' });
  assert.equal(out.length, 2);                 // 'c' queda afuera (otra campaña)
  assert.equal(out[0].published, true);
  assert.equal(out[0].coverUrl, 'cov1');       // cover de la fila
  assert.equal(out[1].coverUrl, 'assetCov2');  // fallback del job
  assert.deepEqual(out[1].mediaUrls, []);      // sin media → abrible igual
});

test('mapScheduledRows sin filas → []', () => {
  assert.deepEqual(mapScheduledRows([], [], { campaignId: 'C1' }), []);
});

test('monthGrid: 42 celdas, arranca lunes, posiciona el 1', () => {
  const g = monthGrid(2026, 11); // diciembre 2026 (1 = martes)
  assert.equal(g.length, 42);
  assert.equal(g[0], null);          // lunes 30-nov no pertenece
  assert.equal(g[1], '2026-12-01');  // martes
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `node --import tsx --test src/lib/calendarMapper.test.ts`
Expected: FAIL (módulo/funciones inexistentes).

- [ ] **Step 3: Implementar** `calendarTypes.ts` (los `type` de arriba) y `calendarMapper.ts` (las funciones).
  - `deriveType`: match por substring de `platform` (`carousel`/`story`/default reel).
  - `toLocalDayKey`: `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day })` → `YYYY-MM-DD`.
  - `cellState`: `published` → 'published'; si `date && date <= now` → 'in_process'; si no → 'future'.
  - `mapScheduledRows`: indexar jobs por `job_id_motor`; filtrar filas cuyo job esté en `campaignId` (si se pasa); `published = status === 'published'`; `coverUrl = row.cover_r2_url ?? job.coverUrl`; `mediaUrls = row.media_r2_urls ?? []`; `date = scheduled_at ? new Date(scheduled_at) : null`.
  - `monthGrid`: índice de día de semana con lunes=0.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `node --import tsx --test src/lib/calendarMapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarTypes.ts src/lib/calendarMapper.ts src/lib/calendarMapper.test.ts
git commit -m "feat(calendar): mapper, estado de celda y grilla de mes (lógica pura + tests)"
```

---

### Task 3: Service de datos — lectura + realtime de `scheduled_posts` del cliente

**Files:**
- Create: `src/lib/calendarService.ts`

**Interfaces:**
- Consumes: `getSupabase()`; `mapScheduledRows`, tipos de Task 2.
- Produces:
  - `getMyCalendarPieces(campaignId: string | null): Promise<CalendarPiece[]>`
  - `subscribeMyCalendar(onChange: () => void): () => void`

- [ ] **Step 1: Implementar** (espejo reducido de `launchesService`):
  - `getMyCalendarPieces`: `select` de `scheduled_posts` con **lista explícita de columnas seguras** (sin `error_message`/`raw`), RLS scopea al cliente. Juntar `job_id` (motor ids) → `content_jobs` por `.in('job_id_motor', ids)` (trae `job_id_motor, campaign_id, type, id`) → cover fallback desde `content_assets` por `.in('job_id', jobUuids).in('kind',['cover_9_16','slide'])` (gotcha de `launchesMapper`). Armar `CalJobRow[]` y llamar `mapScheduledRows(rows, jobs, { campaignId })`.
  - `subscribeMyCalendar`: `getSupabase().channel('portal-calendar').on('postgres_changes', { event:'*', schema:'public', table:'scheduled_posts' }, onChange).subscribe()`; devolver cleanup que hace `removeChannel`.
- [ ] **Step 2: Verificar typecheck/build**

Run: `npm run build`
Expected: compila sin errores de tipos en `calendarService.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/calendarService.ts
git commit -m "feat(calendar): service de lectura + realtime de scheduled_posts del cliente"
```

---

### Task 4: Componente `CampaignCalendar` — grilla, blur, modal con player

**Files:**
- Create: `src/components/portal/CampaignCalendar.tsx`
- Modify: `src/components/portal/portal.css` (clases `.cal-*`)

**Interfaces:**
- Consumes: `getMyCalendarPieces`, `subscribeMyCalendar` (Task 3); `cellState`, `monthGrid`, `toLocalDayKey` (Task 2); `PortalVideo` (`{ src, poster }`).
- Produces: `CampaignCalendar({ campaignId }: { campaignId: string | null })`.

- [ ] **Step 1: Implementar**:
  - Carga piezas por `campaignId`; `subscribeMyCalendar` para refresco en vivo; tick `setInterval(60_000)` para mover "hoy"/future→presente (no gasta celdas por sí mismo).
  - Mes mostrado: el de la primera pieza de la campaña (o mes actual si no hay); nav prev/next entre meses con piezas.
  - Celda: agrupa piezas por `toLocalDayKey(date)`. Portada = `coverUrl`. Estados por `cellState`:
    - `future` → nítida, "Programado · HH:mm".
    - `published` → portada con `blur(6px)` + velo + check "Publicado".
    - `in_process` → neutro "En proceso" (sin velo, sin check).
    - Día de hoy → borde acento CreAPP, sin blur.
  - Click en celda con pieza → modal: `PortalVideo` si hay `mediaUrls[0]` (reel/story) o carrusel (slides = `mediaUrls`); si no hay media, portada grande; + `caption`; + "Ver en Instagram" (`permalink`) si existe.
  - Empty state (sin piezas): "Tu campaña todavía no se lanzó. Cuando la aprobemos y la pongamos en marcha, vas a ver acá el calendario."
  - Error de carga: mensaje suave + botón reintentar.
  - CSS `.cal-*` en `portal.css` (grilla 7 col, celda con portada, velo/blur, modal). Look shadcn, acentos CreAPP solo en chrome (hoy/activo).
- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila.

- [ ] **Step 3: Humo manual** (Review Focus): con un cliente con `scheduled_posts` → ver grilla, abrir una publicada (blur + permalink) y una futura; con un cliente sin piezas → empty state, no error.

- [ ] **Step 4: Commit**

```bash
git add src/components/portal/CampaignCalendar.tsx src/components/portal/portal.css
git commit -m "feat(calendar): grilla de campaña con blur temporal y player embebido"
```

---

### Task 5: `PortalShell` — sidebar colapsable CreAPP

**Files:**
- Create: `src/components/portal/PortalShell.tsx`
- Modify: `src/components/portal/portal.css` (clases `.psb-*` sidebar)

**Interfaces:**
- Consumes: `lucide-react` (`Sparkles, ClipboardCheck, CalendarDays, BarChart3, Lock, LogOut, PanelLeftClose, PanelLeft`).
- Produces: `PortalShell({ active, onNavigate, pendingCount, onSignOut, children })` con `active: 'campania' | 'revision' | 'calendario'` y `onNavigate(section)`. Renderiza sidebar + `children` (el contenido de la sección) en el área derecha.

- [ ] **Step 1: Implementar**:
  - Sidebar colapsable: expandido ~230px con labels, colapsado ~64px íconos; estado en `localStorage` (`try/catch`). Mobile (`<=820px`): drawer off-canvas con overlay + botón hamburguesa.
  - Ítems: Campaña (`Sparkles`), Revisión (`ClipboardCheck`, badge con `pendingCount` si >0), Calendario (`CalendarDays`), Insights (`BarChart3` + `Lock`, **disabled**, tooltip "Muy pronto").
  - Footer: `AgencyBadge` CreAPP + cerrar sesión (`LogOut`).
  - Activo: barra-glow izquierda + `box-shadow` violeta (`#b06cff`); hover elevación sutil. Gradiente CreAPP solo en el chrome.
- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/PortalShell.tsx src/components/portal/portal.css
git commit -m "feat(portal): shell con sidebar colapsable estetica CreAPP"
```

---

### Task 6: Integrar en `PortalView` — montar shell + secciones

**Files:**
- Modify: `src/pages/PortalView.tsx`
- Create: `src/components/portal/PortalReviewSection.tsx` (extrae el bloque de revisión actual)

**Interfaces:**
- Consumes: `PortalShell` (Task 5), `CampaignCalendar` (Task 4). Reusa `PieceReview`, `pickCampaign`, review queue (sin cambios de lógica).
- Produces: `PortalView` montando `PortalShell` con estado `active` (default `'revision'`), pasando `campaignId = campaign?.id` a `CampaignCalendar`. "Campaña" = hero/identidad; "Revisión" = `PortalReviewSection` (el bloque actual `topbar switcher + PieceReview + decide`); "Calendario" = `CampaignCalendar`.

- [ ] **Step 1: Extraer** el bloque de revisión actual (switcher de campaña + `PieceReview` + handlers `decide/approve/sendChanges/approveRemaining`) a `PortalReviewSection.tsx`, **sin cambiar su comportamiento**. El switcher de campaña sigue escribiendo `params('campaign')` (compartido con el calendario).
- [ ] **Step 2: Montar** `PortalShell` en `PortalView`: `active` en estado local (opcional sync con `?view=`), `pendingCount` = piezas `sent`, `onSignOut = signOut`. Render de la sección activa. Empty/loading states se preservan.
- [ ] **Step 3: Verificar build + humo end-to-end**

Run: `npm run build`
Expected: compila. Humo: `/portal` → sidebar colapsa/expande; Revisión aprueba igual que antes; Calendario muestra la campaña; Insights bloqueado.

- [ ] **Step 4: Verificar integridad de tests de lib**

Run: `node --import tsx --test src/lib/*.test.ts`
Expected: PASS (incluye los de Task 2; nada roto).

- [ ] **Step 5: Commit**

```bash
git add src/pages/PortalView.tsx src/components/portal/PortalReviewSection.tsx
git commit -m "feat(portal): monta shell con secciones Campania/Revision/Calendario/Insights"
```

---

## Notas de ejecución

- Antes de empezar, aislar en worktree/branch del repo del portal (skill `using-git-worktrees`). El repo está en `main`.
- Orden estricto 1→6 (acoplamiento por interfaces: mapper→service→componente→shell→integración). Task 1 (RLS) puede ir en paralelo pero su verificación es manual en Supabase.
- Insights/P2 queda fuera de este plan: el ítem de sidebar queda bloqueado.
