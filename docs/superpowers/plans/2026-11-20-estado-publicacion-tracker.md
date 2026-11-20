# Estado de publicación en el tracker (solo lectura) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el tracker de contenido que el equipo ya usa (`ContentCampaignsTab`)
muestre, en vivo y sin acciones, el estado de publicación de cada pieza
(`scheduled_posts.status`), leyendo la misma tabla que ya escriben el motor y
el cron de Vercel.

**Architecture:** se extiende la cadena ya existente
`contentTrackerMapper.ts` → `contentTrackerService.ts` → `ContentCampaignsTab`
→ `PieceStatusRow.tsx` con una columna más (`publishStatus` /
`publishErrorMessage`), unida por `client_id` + `job_id`/`job_id_motor`. Una
migración SQL nueva habilita RLS de lectura para el equipo y suma la tabla
al canal realtime ya usado.

**Tech Stack:** TypeScript, `@supabase/supabase-js`, `node:test` +
`node:assert/strict` (mismo runner que ya usa el repo).

**Spec:** `docs/superpowers/specs/2026-11-20-estado-publicacion-tracker-design.md`

## Global Constraints

- Solo lectura — ninguna acción (reintentar/cancelar) sobre `scheduled_posts`
  desde esta UI.
- Lectura de equipo (`admin`/`vendedor`), nunca el cliente final — mismo
  patrón que `content_jobs`/`content_campaigns` en
  `supabase/migrations/20261107120000_create_content_foundation.sql:122-132`.
- `mapTracker` sigue siendo retrocompatible: el nuevo parámetro de filas de
  `scheduled_posts` es opcional (default `[]`), para no tener que tocar
  ninguno de los call-sites existentes en `contentTrackerMapper.test.ts`.
- Una pieza sin fila en `scheduled_posts` muestra `publishStatus: null` — no
  es un error, es "todavía no programada".

## Review Focus

- Dos piezas del mismo cliente con distinto `job_id_motor` no deben
  cruzarse: cada una tiene que resolver su propia fila de `scheduled_posts`,
  nunca la de otra pieza del mismo cliente.
- Una pieza con `job_id_motor` que no matchea ninguna fila de
  `scheduled_posts` (todavía no programada) debe dar `publishStatus: null`,
  no tirar una excepción ni mostrar un estado inventado.
- Si `scheduled_posts` tiene más de una fila para el mismo
  `client_id`+`job_id` (no debería pasar por el `UNIQUE` de la tabla, pero
  nada en el mapper lo garantiza), el mapeo no debe romperse — usar la
  primera que encuentre es aceptable, no hace falta deduplicar con criterio.
- El chip de `error` tiene que mostrar el mensaje real de
  `scheduled_posts.error_message`, no un texto genérico — es la razón de ser
  de este cambio (ver qué falló, no solo que algo falló).

---

### Task 1: Migración SQL — RLS + realtime para `scheduled_posts`

**Files:**
- Create: `supabase/migrations/<timestamp>_scheduled_posts_rls_realtime.sql`
  (timestamp real del momento de creación, formato `YYYYMMDDHHMMSS`, mismo
  que el resto de `supabase/migrations/`)

- [ ] **Step 1: Escribir la migración**

```sql
-- Habilita lectura de equipo y realtime sobre scheduled_posts (motor/cron),
-- para el tracker de contenido. Ver
-- docs/superpowers/specs/2026-11-20-estado-publicacion-tracker-design.md
-- Mismo patrón que content_jobs en 20261107120000_create_content_foundation.sql.

alter table public.scheduled_posts enable row level security;

drop policy if exists "Team can read scheduled_posts" on public.scheduled_posts;
create policy "Team can read scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scheduled_posts'
  ) then
    alter publication supabase_realtime add table public.scheduled_posts;
  end if;
end $$;
```

- [ ] **Step 2: Verificación de sintaxis (no se aplica a una base real desde
  este entorno)**

Run: `cat supabase/migrations/<archivo>.sql | head -1` para confirmar que el
archivo se creó con el nombre correcto, y una lectura visual de que el SQL
no tiene errores obvios de sintaxis (paréntesis, `;` finales). La aplicación
real queda para cuando el usuario corra esta migración junto con la de
`scheduled_posts` del plan hermano (`cola-publicacion-supabase-motor.md`)
en el SQL Editor de Supabase.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/<archivo>.sql
git commit -m "feat: RLS de equipo + realtime para scheduled_posts (tracker)"
```

---

### Task 2: Tipos y mapper — unir `scheduled_posts` a cada pieza

**Files:**
- Modify: `src/lib/contentTrackerTypes.ts`
- Modify: `src/lib/contentTrackerMapper.ts`
- Test: `src/lib/contentTrackerMapper.test.ts` (agregar casos, no tocar los
  existentes)

**Interfaces:**
- Produces: `export type PublishStatus = 'queued' | 'containerizing' |
  'ready' | 'publishing' | 'published' | 'error';` y
  `export interface TScheduledPostRow { client_id: string; job_id: string;
  status: string; error_message: string | null }` en
  `contentTrackerMapper.ts` (junto a los demás `T*Row`).
- `TrackerPiece` (en `contentTrackerTypes.ts`) gana:
  `publishStatus: PublishStatus | null; publishErrorMessage: string | null;`
- `mapTracker` gana un séptimo parámetro opcional:
  `scheduledPosts: TScheduledPostRow[] = []`. Todos los call-sites
  existentes (6 en el test, 1 en el servicio del Task 3) siguen compilando
  sin cambios.

- [ ] **Step 1: Escribir los tests nuevos (agregar al final de
  `contentTrackerMapper.test.ts`, sin tocar los existentes)**

```typescript
// jb() ya existe en este archivo (helper de fixture) — reusarlo, no duplicar.
const jobsDistinct = [jb('p1', { job_id_motor: 'motor-1' }), jb('p2', { job_id_motor: 'motor-2' })];

test('publishStatus se resuelve por client_id + job_id_motor, sin cruzarse entre piezas', () => {
  const rows = [
    { client_id: 'c1', job_id: 'motor-1', status: 'containerizing', error_message: null },
    { client_id: 'c1', job_id: 'motor-2', status: 'published', error_message: null },
  ];
  const r = mapTracker(clients, campaigns, jobsDistinct, [], [], [], rows);
  const [p1, p2] = r.clients[0].campaigns[0].pieces;
  assert.equal(p1.publishStatus, 'containerizing');
  assert.equal(p2.publishStatus, 'published');
});

test('publishStatus es null si no hay fila en scheduled_posts (sin programar)', () => {
  const r = mapTracker(clients, campaigns, jobsDistinct, [], [], [], []);
  const [p1, p2] = r.clients[0].campaigns[0].pieces;
  assert.equal(p1.publishStatus, null);
  assert.equal(p2.publishStatus, null);
  assert.equal(p1.publishErrorMessage, null);
});

test('publishStatus error expone error_message', () => {
  const rows = [{ client_id: 'c1', job_id: 'motor-1', status: 'error', error_message: 'Falta META_ACCESS_TOKEN__dental_ia' }];
  const r = mapTracker(clients, campaigns, jobsDistinct, [], [], [], rows);
  const [p1, p2] = r.clients[0].campaigns[0].pieces;
  assert.equal(p1.publishStatus, 'error');
  assert.equal(p1.publishErrorMessage, 'Falta META_ACCESS_TOKEN__dental_ia');
  assert.equal(p2.publishStatus, null);
});

test('mapTracker sin scheduledPosts (parámetro omitido) sigue funcionando — retrocompatible', () => {
  const r = mapTracker(clients, campaigns, jobs, assets, approvals, profiles);
  assert.equal(r.clients[0].campaigns[0].pieces[0].publishStatus, null);
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `node --test src/lib/contentTrackerMapper.test.ts`
Expected: FAIL (los campos/parámetro todavía no existen; los tests viejos
siguen pasando)

- [ ] **Step 3: Implementar en `contentTrackerTypes.ts` y `contentTrackerMapper.ts`**

En `mapTracker`, armar un `Map` por `` `${client_id}:${job_id}` `` a partir de
`scheduledPosts` ANTES del `.map(toPiece)`, y dentro de `toPiece` resolverlo
con `` `${j.client_id}:${j.job_id_motor}` ``. Si no hay match,
`publishStatus`/`publishErrorMessage` quedan en `null`.

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `node --test src/lib/contentTrackerMapper.test.ts`
Expected: PASS (todos — los 7 existentes + los 4 nuevos)

- [ ] **Step 5: Commit**

```bash
git add src/lib/contentTrackerTypes.ts src/lib/contentTrackerMapper.ts src/lib/contentTrackerMapper.test.ts
git commit -m "feat: unir scheduled_posts a cada pieza del tracker (publishStatus)"
```

---

### Task 3: Servicio — traer y escuchar `scheduled_posts`

**Files:**
- Modify: `src/lib/contentTrackerService.ts`

**Interfaces:**
- Consumes: `mapTracker(..., scheduledPosts)` (Task 2).
- Produces: `getTrackerOverview` y `subscribeTracker` mantienen sus firmas
  actuales (sin parámetros nuevos) — el cambio es interno.

- [ ] **Step 1: Sumar la query de `scheduled_posts` a `getTrackerOverview`**

Agregar al `Promise.all` existente:
`sb.from('scheduled_posts').select('client_id, job_id, status, error_message')`
(sin filtro — el RLS de equipo del Task 1 ya acota qué puede leer la sesión).
Pasar el resultado como séptimo argumento a `mapTracker`. Igual que los
demás, chequear `.error` y tirar si falla.

- [ ] **Step 2: Sumar `scheduled_posts` al canal de `subscribeTracker`**

`.on('postgres_changes', { event: '*', schema: 'public', table:
'scheduled_posts' }, () => onChange())` agregado a la cadena ya existente
del canal `content-tracker`.

- [ ] **Step 3: Verificación manual (este archivo no tiene test dedicado hoy,
  consistente con el resto de `contentTrackerService.ts`)**

Run: `node --test src/lib/*.test.ts` (suite completa) para confirmar que
nada se rompió por un error de sintaxis/import.
Expected: todos los tests existentes siguen en verde.

**Pendiente real, no automatizable desde este entorno (constraint del
spec):** antes de confiar en este join en producción, correr
`getTrackerOverview()` una vez contra datos reales (o una query manual en
el SQL Editor de Supabase comparando `scheduled_posts.client_id`/`job_id`
contra `content_jobs.client_id`/`job_id_motor` de una pieza ya programada)
y confirmar que efectivamente matchea. Si los esquemas de `client_id`
difieren entre el motor y el portal, el join da todo `null` en silencio —
ningún test unitario con fixtures lo puede detectar.

- [ ] **Step 4: Commit**

```bash
git add src/lib/contentTrackerService.ts
git commit -m "feat: traer y escuchar scheduled_posts en el tracker"
```

---

### Task 4: UI — chip de estado de publicación en `PieceStatusRow`

**Files:**
- Modify: `src/components/admin/campaigns/PieceStatusRow.tsx`

**Interfaces:**
- Consumes: `piece.publishStatus`, `piece.publishErrorMessage` (Task 2).

- [ ] **Step 1: Agregar el mapa de estilo por estado**

Mismo patrón que `CHIP`/`STAGE_LABEL` ya en el archivo (líneas 9-18):

```typescript
const PUBLISH_LABEL: Record<PublishStatus, string> = {
  queued: 'Programada', containerizing: 'Preparando', ready: 'Lista',
  publishing: 'Publicando', published: 'Publicada', error: 'Error al publicar',
};
const PUBLISH_CLS: Record<PublishStatus, string> = {
  queued: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  containerizing: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  ready: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  publishing: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
};
```

(Import `PublishStatus` desde `@/lib/contentTrackerTypes`.)

- [ ] **Step 2: Renderizar el chip junto al de "Renderizada" (después de la
  línea 73), solo si `piece.publishStatus` no es `null`**

```tsx
{piece.publishStatus && (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${PUBLISH_CLS[piece.publishStatus]}`}
    title={piece.publishStatus === 'error' ? (piece.publishErrorMessage ?? undefined) : undefined}
  >
    {PUBLISH_LABEL[piece.publishStatus]}
  </span>
)}
```

- [ ] **Step 3: Verificación manual**

Run: `npm test` (suite completa) — este componente no tiene test dedicado
(consistente con el resto de los componentes de `src/components/admin/`);
confirmar que no rompió el build con `node --check` equivalente o
simplemente que el resto de la suite sigue en verde.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/campaigns/PieceStatusRow.tsx
git commit -m "feat: chip de estado de publicación en PieceStatusRow"
```
