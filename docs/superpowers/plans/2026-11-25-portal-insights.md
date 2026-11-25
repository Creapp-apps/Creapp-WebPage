# Portal del cliente — Insights / Estadísticas (P2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección Insights en el portal (desbloquea el 🔒) que muestra las métricas reales de la cuenta IG del cliente (cuenta + pieza por pieza), vía un endpoint server cacheado, sin exponer el token.

**Architecture:** Vercel API route `GET /api/portal/insights` autentica al cliente (member), resuelve su SLUG, pega a Graph (token env `META_ACCESS_TOKEN__<slug>` + `scheduled_posts.ig_account_id`), cachea ~45 min en Supabase `ig_insights_cache`, devuelve JSON seguro. El portal lo consume y pinta stat tiles + sparklines SVG + lista de piezas. Lógica pura (shape, orden, frescura, decisión de caché/slug) en `src/lib/` con tests node:test; endpoint/UI por build + humo.

**Tech Stack:** React 18 + react-router, Vercel serverless (Node), Supabase service role, Meta Graph v21, lucide, CSS `portal.css`. Tests: `node --import tsx --test src/lib/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-25-portal-insights-design.md`

## Global Constraints

- Token de Meta **server-only**. Nunca en el browser. Todo Graph en la API route.
- **Slug es la llave** de insights (token, `scheduled_posts`, PK del caché).
  `client_members.client_id` es uuid → traducir a slug (join `clients`).
- Auth del request = **member** (nuevo `requireMember`), no admin.
- **Degradar, no romper**: una métrica o una pieza que falla no 500ea la página.
- Mono-cliente (portal usa `limit(1)`); el frontend no manda `?client=`.
- Sparklines SVG inline, sin lib nueva. Cargar skill `dataviz` antes de dibujar.
- Tests de lógica en `src/lib/*.test.ts` (node:test + node:assert/strict).
- Caché server-only (service role lee/escribe); sin RLS de member sobre el caché.
- Contenido del cliente = tema cliente; **chrome-only**: nada de violeta CreAPP.
- Graph base `v21.0` (`GRAPH_API_BASE`, `metaCronService.ts`). Token por cliente =
  `META_ACCESS_TOKEN__<slug>` (`resolveClientToken`, `publishQueuePhases.ts`).

## Review Focus

- **Token env faltante** para el cliente → payload vacío con `needsConnection: true`, no 500. → test Task 2 (`buildPayload`/`pickClientSlug`) + Task 4.
- **Métrica de cuenta que falla** (ej. demographics <100 seguidores) → se omite, el resto renderiza. → test Task 2 (`mapAccountInsights`).
- **Pieza cuyo media-insights falla** → pieza con métricas nulas, página no rompe. → test Task 2 (`mapPieceInsights`).
- **Frontera de frescura del caché** (justo en TTL) y piso de force-refresh. → test Task 2 (`isCacheFresh`, `canForceRefresh`).
- **Member pide `?client=<slug ajeno>`** → 403, sin cross-tenant. → test Task 2 (`pickClientSlug` rechaza slug no-miembro).

---

### Task 1: Migration — tabla de caché `ig_insights_cache`

**Files:**
- Create: `supabase/migrations/20261125130000_ig_insights_cache.sql`

**Interfaces:**
- Produces: tabla `public.ig_insights_cache(client_id text pk, payload jsonb, fetched_at timestamptz)`, RLS on, sin policies de member (solo service role).

- [ ] **Step 1: Escribir la migration**:

```sql
create table if not exists public.ig_insights_cache (
  client_id text primary key,  -- SLUG (misma llave que token y scheduled_posts)
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.ig_insights_cache enable row level security;
-- Sin policies: solo el service role (los endpoints server) lee/escribe.
```

- [ ] **Step 2: Verificar** (manual, SQL Editor de Supabase — sin runner de SQL): aplicar; confirmar que la tabla existe, RLS habilitada, y que un `authenticated` común NO puede leerla (0 filas / sin policy). Dejar nota en el PR.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261125130000_ig_insights_cache.sql
git commit -m "feat(insights): tabla de cache ig_insights_cache (server-only)"
```

---

### Task 2: Lógica pura — tipos + mapper + decisiones (caché/slug/frescura)

**Files:**
- Create: `src/lib/insightsTypes.ts`
- Create: `src/lib/insightsMapper.ts`
- Test: `src/lib/insightsMapper.test.ts`

**Interfaces:**
- Consumes: nada (puro).
- Produces:
  - `type AccountMetric = { key: string; label: string; total: number; series: { t: string; v: number }[] }`
  - `type PieceInsight = { mediaId: string; type: 'reel'|'carousel'|'image'; coverUrl: string | null; permalink: string | null; caption: string | null; reach: number | null; likes: number | null; comments: number | null; shares: number | null; saved: number | null; total: number | null }`
  - `type InsightsPayload = { account: AccountMetric[]; pieces: PieceInsight[]; followerCount: number | null; needsConnection: boolean }`
  - `pickClientSlug(clients: { slug: string }[], requested?: string | null): { slug: string } | { error: 403 | 404 }` — sin `requested` → el primero; con `requested` → debe ∈ `clients` (si no, `{error:403}`); lista vacía → `{error:404}`.
  - `isCacheFresh(fetchedAtISO: string | null, now: Date, ttlMin?: number): boolean` (default 45).
  - `canForceRefresh(fetchedAtISO: string | null, now: Date, floorMin?: number): boolean` (default 5; sin caché → true).
  - `mapAccountInsights(graphMetrics: RawMetric[]): { account: AccountMetric[]; followerCount: number | null }` — tolera métricas ausentes/erróneas.
  - `mapPieceInsights(rows: PieceRow[], byMediaId: Record<string, RawMetric[] | null>): PieceInsight[]` — pieza sin datos → métricas null.
  - `topPieces(pieces: PieceInsight[], by: 'reach'|'saved'): PieceInsight[]`
  - `freshnessLabel(fetchedAtISO: string, now: Date): string` ("hace 3 min" / "hace 2 h").
  - (`RawMetric = { name: string; values: { value: number }[] }`, `PieceRow = { published_media_id: string; platform: string | null; cover_r2_url: string | null; permalink: string | null; caption: string | null }`.)

- [ ] **Step 1: Escribir los tests** `src/lib/insightsMapper.test.ts` (node:test). Casos:
  - `pickClientSlug`: sin requested → `clients[0]`; requested miembro → ok; requested ajeno → `{error:403}`; vacío → `{error:404}`.
  - `isCacheFresh`: `fetched = now-10min`, ttl 45 → true; `now-50min` → false; `null` → false.
  - `canForceRefresh`: `null` → true; `now-2min`, floor 5 → false; `now-10min` → true.
  - `mapAccountInsights`: dado un payload con `reach` (serie) + `follower_count`, arma `account[]` con total y serie y `followerCount`; una métrica ausente no aparece y no tira.
  - `mapPieceInsights`: 2 rows, una con métricas (`reach,likes,...`), otra con `null` → la segunda queda con métricas null; `type` derivado de `platform`.
  - `topPieces`: ordena desc por `reach` (nulls al final).
  - `freshnessLabel`: `now-3min` → "hace 3 min"; `now-2h` → contiene "h".

- [ ] **Step 2: Correr y ver fallar** — `node --import tsx --test src/lib/insightsMapper.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar** `insightsTypes.ts` + `insightsMapper.ts` con las firmas de arriba. `mapAccountInsights`/`mapPieceInsights` leen `values[].value` defensivamente (optional chaining, default null). `derivePieceType(platform)` reutiliza el criterio de `calendarMapper.deriveType` (reel/carousel; 'image' si no es video).
- [ ] **Step 4: Correr y ver pasar** — `node --import tsx --test src/lib/insightsMapper.test.ts` → PASS; y la suite completa `src/lib/*.test.ts` verde.
- [ ] **Step 5: Commit**

```bash
git add src/lib/insightsTypes.ts src/lib/insightsMapper.ts src/lib/insightsMapper.test.ts
git commit -m "feat(insights): mapper, decisiones de cache/slug/frescura (puro + tests)"
```

---

### Task 3: Auth helper `requireMember`

**Files:**
- Create: `api/_lib/requireMember.ts`

**Interfaces:**
- Consumes: Supabase service role (como `requireAdmin`).
- Produces: `requireMember(req): Promise<{ user, clients: { id: string; slug: string }[] }>` — 401 sin Bearer/sesión; 403 si no es miembro de ningún cliente.

- [ ] **Step 1: Implementar** espejo de `api/_lib/requireAdmin.ts`: parsear Bearer, `supabase.auth.getUser(token)` (service role), luego `client_members.select('client_id').eq('user_id', user.id)`; con esos uuids, `clients.select('id, slug').in('id', uuids)`. Sin filas → `throw fail(403)`. Devolver `{ user, clients }`.
- [ ] **Step 2: Verificar typecheck** — `npx tsc --noEmit` sin errores en `requireMember.ts`.
- [ ] **Step 3: Commit**

```bash
git add api/_lib/requireMember.ts
git commit -m "feat(insights): requireMember (auth de cliente del portal)"
```

---

### Task 4: Endpoint `GET /api/portal/insights`

**Files:**
- Create: `api/portal/insights.ts`

**Interfaces:**
- Consumes: `requireMember` (T3), `serviceClient`, `applyPortalCors`, `resolveClientToken` (`src/lib/publishQueuePhases`), `GRAPH_API_BASE` (`src/lib/metaCronService` — exportarlo si no lo está), `pickClientSlug/isCacheFresh/canForceRefresh/mapAccountInsights/mapPieceInsights` (T2).
- Produces: `{ ok: true, payload: InsightsPayload, fetched_at: string }` | error.

- [ ] **Step 1: Implementar** el handler según spec §6.3:
  - CORS + solo GET; `requireMember`; `pickClientSlug(clients, req.query.client)` → 403/404 según el error.
  - Leer `ig_insights_cache` por slug (service role). `isCacheFresh` y no `?refresh=1` → devolver cache.
  - `?refresh=1` solo si `canForceRefresh` (si no, servir el caché igual).
  - Recompute: `ig_account_id` desde `scheduled_posts` (`client_id = slug`, cualquier fila); `resolveClientToken(slug, process.env)` en try/catch → `needsConnection:true` si falta. Fetch de cuenta (metrics del spec, params fijados probando en vivo) y por pieza (filas `status='published'` con `published_media_id`), **cada fetch en try/catch** (degradación). `mapAccountInsights` + `mapPieceInsights`. `upsert` caché. Devolver.
  - `AbortController` con timeout por fetch (patrón `cron-logs.ts`). Nunca filtrar token ni error crudo.
- [ ] **Step 2: Verificar build** — `npm run build` compila.
- [ ] **Step 3: Commit**

```bash
git add api/portal/insights.ts src/lib/metaCronService.ts
git commit -m "feat(insights): endpoint /api/portal/insights (Graph + cache 45min)"
```

---

### Task 5: Service frontend `insightsService.ts`

**Files:**
- Create: `src/lib/insightsService.ts`

**Interfaces:**
- Consumes: `getSupabase().auth.getSession()` (bearer), `insightsMapper` types.
- Produces: `getMyInsights(opts?: { refresh?: boolean }): Promise<{ payload: InsightsPayload; fetchedAt: string }>` — `fetch('/api/portal/insights' + (refresh?'?refresh=1':''), { Authorization })`, patrón de `launchesService.call`.

- [ ] **Step 1: Implementar** (espejo reducido de `launchesService.call`: token de sesión, fetch, manejo de `!res.ok`).
- [ ] **Step 2: Verificar typecheck** — `npx tsc --noEmit` sin errores en `insightsService.ts`.
- [ ] **Step 3: Commit**

```bash
git add src/lib/insightsService.ts
git commit -m "feat(insights): service frontend getMyInsights"
```

---

### Task 6: Sección `PortalInsights` + desbloqueo del sidebar + wire

**Files:**
- Create: `src/components/portal/PortalInsights.tsx`
- Modify: `src/components/portal/PortalShell.tsx` (agregar `'insights'` a `PortalSection`, el ítem deja de estar `locked/disabled`)
- Modify: `src/pages/PortalView.tsx` (render de la sección insights)
- Modify: `src/components/portal/portal.css` (clases `.ins-*`)

**Interfaces:**
- Consumes: `getMyInsights` (T5), `freshnessLabel/topPieces` (T2).
- Produces: `PortalInsights` (sin props; resuelve el cliente server-side). `PortalSection` incluye `'insights'`.

- [ ] **Step 1: Cargar la skill `dataviz`** (antes de dibujar sparklines/stat tiles).
- [ ] **Step 2: Implementar `PortalInsights.tsx`**:
  - `getMyInsights` al montar; estado loading/error/empty.
  - **Tu cuenta**: stat tiles (seguidores, alcance, visitas, interacciones) con **sparkline SVG inline** de `metric.series`; demographics solo si vienen.
  - **Tus piezas**: grid/lista de `pieces` (portada + reach/likes/comments/shares/saved), ordenable (`topPieces`), link al `permalink`.
  - Header "Actualizado hace X" (`freshnessLabel`) + botón "Actualizar" (`getMyInsights({refresh:true})`).
  - `needsConnection` → estado "Todavía no conectamos tus estadísticas".
  - Acentos del cliente (`--wood`), **nada de violeta CreAPP** en el contenido.
- [ ] **Step 3: Desbloquear el sidebar** en `PortalShell.tsx`: `'insights'` entra en `PortalSection` y el ítem Insights pasa a navegable (sacar `locked/disabled`, sumarlo a `NAV`).
- [ ] **Step 4: Wire en `PortalView.tsx`**: `{active === 'insights' && <PortalInsights />}`.
- [ ] **Step 5: Verificar build + suite** — `npm run build` compila; `node --import tsx --test src/lib/*.test.ts` verde.
- [ ] **Step 6: Humo manual** (Review Focus): cliente con cuenta → tiles+sparklines+piezas; botón Actualizar; cliente sin token → "Todavía no conectamos"; una métrica/pieza faltante no rompe.
- [ ] **Step 7: Commit**

```bash
git add src/components/portal/PortalInsights.tsx src/components/portal/PortalShell.tsx src/pages/PortalView.tsx src/components/portal/portal.css
git commit -m "feat(insights): seccion PortalInsights + desbloqueo del sidebar"
```

---

## Notas de ejecución

- Worktree/branch nuevo del repo del portal (`using-git-worktrees`), desde `main`
  (ya trae P1).
- Orden 1→6 (acople por interfaces: mapper→endpoint→service→UI; auth antes del
  endpoint). Task 1 (SQL) y su verificación son manuales en Supabase.
- `ig_account_id` por cliente sale de cualquier `scheduled_posts` suyo; cliente sin
  piezas → payload vacío honesto (mismo criterio que el calendario vacío de P1).
