# Lanzamientos — Centro de Control de Publicaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un tablero realtime en el portal para ver, diagnosticar y actuar sobre todas las publicaciones programadas (cola `scheduled_posts` + cron de Vercel), con detección de fallas de fila y de infra.

**Architecture:** Dos señales realtime convergen en Supabase y el front las lee por un canal: estado por pieza (`scheduled_posts`) + salud de infra (`cron_runs` heartbeat auto-reportado, `cron_log_events` del Log Drain, `deploy_events` de webhooks). La lógica pura (salud, "trabada", guardas de acción, parseo de drain, verificación de firma, resolución de rol) vive en `src/lib` con tests `node --test`. Las acciones admin pasan por funciones serverless `api/launches/*` autenticadas por JWT de Supabase + rol, que mutan con service role.

**Tech Stack:** React + Vite (portal), funciones serverless TS en `/api` (runtime Node de Vercel), Supabase (Postgres + realtime + RLS), `@supabase/supabase-js`, Node test runner vía `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-21-lanzamientos-control-center-design.md`

## Global Constraints

- Toda función TS en `/api` importa con extensión **`.js`**, nunca `.ts` (runtime de Vercel; fix 2026-11-21). Tests corren con `node --import tsx --test`.
- El browser **nunca** tiene `VERCEL_TOKEN`, `CRON_SECRET` ni `SUPABASE_SERVICE_ROLE_KEY`; todo lo privilegiado va en `api/*`.
- `scheduled_posts.status` es **`text`** (no enum). Cancelar usa **`'cancelled'`** (doble L, valor existente del motor), nunca un valor nuevo.
- Cancelar es válido solo desde `queued`/`containerizing`/`ready` (nunca `publishing`/`published`/`cancelled`), espejando `SupabaseSync.cancel_scheduled_post` del motor.
- Endpoints de acción: admin-only. Rol = `user_profiles.role === 'admin'` **O** `isDefaultAdminEmail(user.email)` (fallback del cliente en `AuthContext.tsx`).
- Firma: Webhooks de Vercel = **HMAC-SHA1 del raw body** en `x-vercel-signature`; Log Drain = secreto propio configurado. Leer raw body sin parsear antes de verificar. Confirmar esquema exacto contra la doc viva de Vercel al construir.
- Umbrales (constantes tuneables): "heartbeat rancio" = sin `cron_runs` con `outcome='ok'` y `finished_at` en > 18 min; "fila trabada" = `queued`/`containerizing` sin cambio por > 20 min con heartbeat sano.
- Estética: tema dark+violeta del Content Studio (tokens existentes); guardrail chrome-only (no tocar motion). Gate `node scripts/test_frontend_integrity.js` + `pytest`/node donde aplique.
- Alcance: solo el camino cloud (`scheduled_posts`). Clientes local-mode y el publicador legacy de GitHub Actions quedan afuera.

## Review Focus

1. **Cron crasheado en el import (sin ninguna fila `cron_runs`):** la salud debe mostrar "cron caído" por **ausencia** de latido, no solo por un `outcome='error'`. → test en Task 2.
2. **Payload del Log Drain que NO es error de infra del cron** (logs de otras funciones, `info`): el parser debe ignorarlo y no insertar ruido. → test en Task 7.
3. **Firma de webhook/drain inválida o ausente:** el endpoint responde 401 y **no** inserta. → test en Task 7 (verify) + Task 8 (endpoint).
4. **Acción sobre fila en estado terminal** (cancelar una `publishing`/`published`, reintentar una `published`): la guarda rechaza con error claro, sin mutar. → tests en Task 3.
5. **Caller no-admin / token inválido** pega a un endpoint de acción: responde 403/401 y no muta. → test en Task 5 + verify en Task 6.

---

### Task 1: Migraciones Supabase (tablas de salud + alteraciones a `scheduled_posts`)

**Files:**
- Create: `supabase/migrations/20261121_lanzamientos_health.sql`
- Modify (coherencia): en repo motor `src/integrations/supabase_scheduled_posts_schema.sql` (agregar `permalink`, nota de `cancelled`)

**Interfaces:**
- Produces (schema): `cron_runs(id uuid pk, cron_name text, started_at timestamptz, finished_at timestamptz null, outcome text null, processed_count int, published_count int, error_count int, error_text text null, deployment_id text null, git_sha text null)`; `cron_log_events(id uuid pk, received_at timestamptz, deployment_id text, request_id text null, level text, message text, request_path text, raw jsonb)`; `deploy_events(id uuid pk, received_at timestamptz, type text, deployment_id text, git_sha text null, state text null, raw jsonb)`; `scheduled_posts.permalink text null`; trigger `scheduled_posts_set_updated_at` (BEFORE UPDATE → `updated_at = now()`).

- [ ] **Step 1:** Escribir la migración: `CREATE TABLE IF NOT EXISTS` de las 3 tablas; `ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS permalink text;`; función+trigger `BEFORE UPDATE` que setea `updated_at = now()`; RLS `ENABLE` + policy de lectura para rol `admin`/`vendedor` en las 3 tablas (espejar la policy de `20261120204457_scheduled_posts_rls_realtime.sql`); `ALTER PUBLICATION supabase_realtime ADD TABLE` para las 3.
- [ ] **Step 2:** Verificar que el SQL es idempotente (releer: todo `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` antes de `CREATE POLICY`).
- [ ] **Step 3:** Aplicar a la Supabase real (el usuario o Claude vía el flujo de migraciones del proyecto) y verificar con un `select` de cada tabla y `\d scheduled_posts` que `permalink` existe.
- [ ] **Step 4 (motor, coherencia):** Agregar `permalink text` al `CREATE TABLE` del schema del motor y un comentario de que `status` incluye `'cancelled'`. No cambia comportamiento (la tabla ya existe con `IF NOT EXISTS`).
- [ ] **Step 5: Commit** (`feat(lanzamientos): migración tablas de salud + permalink + trigger updated_at`).

---

### Task 2: Lógica de salud y estado (`src/lib/launchesView.ts`, pura)

**Files:**
- Create: `src/lib/launchesView.ts`, `src/lib/launchesTypes.ts`
- Test: `src/lib/launchesView.test.ts`

**Interfaces:**
- Consumes: filas crudas de `scheduled_posts`, `cron_runs`, `cron_log_events`, `deploy_events` (tipos en `launchesTypes.ts`), y un `now: Date`.
- Produces: `computeCronHealth(runs: CronRunRow[], now: Date): { state: 'ok'|'stale'|'down'|'error'; lastRunAt: string|null; ageMin: number|null }` (`down` si no hay ninguna fila; `stale` si la última `ok` es > 18 min; `error` si la última terminó en `error`); `isStuck(row: ScheduledPostRow, cronHealthy: boolean, now: Date): boolean` (true si `queued`/`containerizing` sin cambio por > 20 min y `cronHealthy`); `STALE_MIN=18`, `STUCK_MIN=20` exportadas.

- [ ] **Step 1: Write the failing test** — en `launchesView.test.ts`: `computeCronHealth([], now)` → `state:'down'`; una fila `ok` hace 5 min → `'ok'`; una `ok` hace 25 min → `'stale'`; última con `outcome:'error'` → `'error'`. `isStuck` con fila `queued` `updated_at` hace 25 min y `cronHealthy=true` → `true`; misma fila con `cronHealthy=false` → `false` (es caída de cron, no fila trabada); fila `published` → `false`.
- [ ] **Step 2:** `node --import tsx --test src/lib/launchesView.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `launchesTypes.ts` (row types) y `launchesView.ts` con las funciones y constantes anteriores. Puro, sin I/O.
- [ ] **Step 4:** Correr el test → PASS.
- [ ] **Step 5: Commit** (`feat(lanzamientos): lógica pura de salud de cron y detección de fila trabada`).

---

### Task 3: Guardas de acción (`src/lib/launchesActions.ts`, puro)

**Files:**
- Create: `src/lib/launchesActions.ts`
- Test: `src/lib/launchesActions.test.ts`

**Interfaces:**
- Produces: `canRetry(status): boolean` (`error` o trabada → caller pasa el booleano de trabada); `canCancel(status): boolean` (`queued`/`containerizing`/`ready`); `canReschedule(status): boolean` (`queued`/`ready`); `canForce(status): boolean` (`queued`/`containerizing`/`ready`); cada una con su razón: `actionError(action, status): string|null` (null si válida).

- [ ] **Step 1: Write the failing test** — cubrir Review Focus #4: `canCancel('published')===false`, `canCancel('publishing')===false`, `canCancel('queued')===true`; `canRetry('published')===false`; `actionError('cancel','published')` contiene "ya está". Valores de estado exactos del spec.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar las guardas (tabla de estados permitidos por acción).
- [ ] **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** (`feat(lanzamientos): guardas puras de acciones`).

---

### Task 4: Heartbeat del cron + `permalink` al publicar (modificar `api/cron/publish-queue.ts`)

**Files:**
- Modify: `api/cron/publish-queue.ts`
- Create helper: `src/lib/cronHeartbeat.ts` (pura la parte de armar el payload)
- Test: `src/lib/cronHeartbeat.test.ts`

**Interfaces:**
- Consumes: `createClient` (service role) ya presente en el handler; `process.env.VERCEL_DEPLOYMENT_ID`, `VERCEL_GIT_COMMIT_SHA`.
- Produces: `buildRunStart(env): CronRunInsert` y `buildRunEnd(results): { outcome, processed_count, published_count, error_count, error_text }` en `cronHeartbeat.ts`. En el handler: inserta la fila `started` al inicio (guardando su `id`) y la actualiza al final; al publicar, escribe `permalink` en `scheduled_posts` (traer `permalink` del media de Meta — agregar `fields=permalink` o GET corto en `publishContainer`/fase 3).

- [ ] **Step 1: Write the failing test** — `buildRunEnd` con results `[{status:'published'},{status:'error'}]` → `published_count:1, error_count:1, outcome:'error'`; todo ok → `outcome:'ok'`. `buildRunStart` incluye `cron_name:'publish-queue'` y `started_at`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar `cronHeartbeat.ts` (puro). Luego cablear en `publish-queue.ts`: insert `started` arriba (envuelto en try para no romper el cron si falla), update al final con `buildRunEnd`; y escribir `permalink` al publicar. Imports con `.js`.
- [ ] **Step 4:** Correr test → PASS. Verificación e2e: deploy + `curl -H "Authorization: Bearer $CRON_SECRET" https://creapp.com.ar/api/cron/publish-queue` y `select * from cron_runs order by started_at desc limit 1` → fila con outcome/conteos; publicar una pieza de prueba → `permalink` no nulo.
- [ ] **Step 5: Commit** (`feat(cron): heartbeat cron_runs + permalink al publicar`).

---

### Task 5: Helper de auth admin server-side (`api/_lib/requireAdmin.js`)

**Files:**
- Create: `api/_lib/requireAdmin.js` (+ `src/lib/adminRole.ts` para la parte pura)
- Test: `src/lib/adminRole.test.ts`

**Interfaces:**
- Produces (puro): `resolveIsAdmin({ email, profileRole }): boolean` (`profileRole==='admin'` OR `isDefaultAdminEmail(email)`); reusar/compartir `isDefaultAdminEmail` con el front. Server: `requireAdmin(req): Promise<{ user }|never>` que lee el Bearer, `auth.getUser(token)`, busca `user_profiles.role`, aplica `resolveIsAdmin`, y lanza/retorna 401/403 si no.

- [ ] **Step 1: Write the failing test** — Review Focus #5 (parte pura): `resolveIsAdmin({profileRole:'vendedor', email:'x@y.com'})===false`; `{profileRole:'admin'}===true`; `{email:<default admin email>}===true` aunque `profileRole` sea null.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar `adminRole.ts` (puro, compartiendo `isDefaultAdminEmail`) y `requireAdmin.js` (I/O: getUser + query profile, service role).
- [ ] **Step 4:** Correr test puro → PASS.
- [ ] **Step 5: Commit** (`feat(lanzamientos): requireAdmin con fallback de email`).

---

### Task 6: Endpoints de acción (`api/launches/{retry,force-run,run-tick,cancel,reschedule}.ts`)

**Files:**
- Create: `api/launches/retry.ts`, `api/launches/force-run.ts`, `api/launches/run-tick.ts`, `api/launches/cancel.ts`, `api/launches/reschedule.ts`
- Refactor: en `publish-queue.ts`, extraer la lógica de procesar la cola a `src/lib/runPublishQueue.ts` con parámetro opcional `onlyId?: string` (para `force-run` de una sola fila y `run-tick` global).

**Interfaces:**
- Consumes: `requireAdmin` (Task 5), guardas de `launchesActions` (Task 3), `createClient` service role.
- Produces: cada endpoint POST valida admin → valida guarda → muta (service role) → responde JSON. `retry`: `status='queued'`, limpia `error_message` y `container_id`. `cancel`: `status='cancelled'` (guarda de estado). `reschedule`: set `scheduled_at` + si venía `ready` resetea a `queued` y limpia `container_id`. `force-run`: `runPublishQueue({ onlyId })`. `run-tick`: `runPublishQueue()` (toda la cola). CORS restringido al origen del portal.

- [ ] **Step 1:** Refactor: mover el cuerpo de las 3 fases de `publish-queue.ts` a `src/lib/runPublishQueue.ts` (`runPublishQueue(sb, { onlyId, now }): Promise<Results>`), filtrando por `id` cuando `onlyId`. El handler del cron pasa a llamarlo sin filtro. Imports `.js`. Verificar: `curl` del cron sigue devolviendo el JSON de antes (no rompió nada).
- [ ] **Step 2:** Implementar los 5 endpoints (thin), cada uno con `requireAdmin` + guarda + mutación. `force-run`/`run-tick` usan `runPublishQueue`.
- [ ] **Step 3: Verify (Review Focus #5):** sin header Authorization → 401; con token de `vendedor` → 403; con admin y fila `published` a `cancel` → 4xx con la razón de la guarda; `retry` sobre la fila de prueba en `error` → vuelve a `queued` (verificar en Supabase).
- [ ] **Step 4:** `vite build` para confirmar que las funciones compilan sin el error de extensión `.ts`.
- [ ] **Step 5: Commit** (`feat(lanzamientos): endpoints de acción admin-authed + runPublishQueue acotable`).

---

### Task 7: Verificación de firma + parser del Log Drain (`src/lib/vercelWebhook.ts`, puro)

**Files:**
- Create: `src/lib/vercelWebhook.ts`
- Test: `src/lib/vercelWebhook.test.ts`

**Interfaces:**
- Produces: `verifyVercelSignature(rawBody: string, header: string, secret: string): boolean` (HMAC-SHA1, timing-safe); `parseDrainLine(entry: unknown): CronLogEventInsert|null` (devuelve null si no es `request_path` del cron o `level` no en `error`/`fatal` — Review Focus #2); `parseDeployEvent(payload: unknown): DeployEventInsert|null`.

- [ ] **Step 1: Write the failing test** — Review Focus #2 y #3: `verifyVercelSignature(body, hmacValido, secret)===true`, con firma mala → `false`, header vacío → `false`. `parseDrainLine` de una línea `info` de otra función → `null`; de un `error` del path del cron → objeto con `message`/`deployment_id`. Vector HMAC conocido (calcular con `crypto` en el test).
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar con `node:crypto` (`createHmac('sha1')`, `timingSafeEqual`). Confirmar el formato real del `x-vercel-signature` y del JSON del drain contra la doc viva de Vercel antes de fijar el parseo.
- [ ] **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** (`feat(lanzamientos): verificación de firma Vercel + parser de Log Drain`).

---

### Task 8: Endpoints de ingesta de Vercel (`api/vercel/{log-drain,deploy-hook}.ts`) + forense

**Files:**
- Create: `api/vercel/log-drain.ts`, `api/vercel/deploy-hook.ts`, `api/launches/cron-logs.ts`
- Config: `vercel.json` si hace falta desactivar el body parser para leer raw body.

**Interfaces:**
- Consumes: `verifyVercelSignature`, `parseDrainLine`, `parseDeployEvent` (Task 7), `requireAdmin` (Task 5, para `cron-logs`), service role.
- Produces: `log-drain` POST → lee raw body → verifica firma → por cada entrada `parseDrainLine` → inserta en `cron_log_events`. `deploy-hook` POST → verifica → `parseDeployEvent` → inserta en `deploy_events`. `cron-logs` GET (admin) → proxy a `GET /v1/projects/{id}/deployments/{dep}/runtime-logs` con `VERCEL_TOKEN`.

- [ ] **Step 1:** Implementar los 3 endpoints usando las puras de Task 7 y `requireAdmin`. Leer raw body sin parsear (configurar en `vercel.json`/handler).
- [ ] **Step 2: Verify (Review Focus #3):** POST a `log-drain` con firma inválida → 401 y nada insertado; con payload de prueba firmado correctamente y una línea `error` del cron → una fila en `cron_log_events`. `cron-logs` sin admin → 403.
- [ ] **Step 3:** `vite build` OK.
- [ ] **Step 4: Commit** (`feat(lanzamientos): endpoints log-drain, deploy-hook y forense cron-logs`).

---

### Task 9: Servicio frontend + realtime (`src/lib/launchesService.ts`)

**Files:**
- Create: `src/lib/launchesService.ts`
- Test: `src/lib/launchesService.test.ts` (solo la parte de mapeo/merge pura si se extrae; la suscripción se verifica manual)

**Interfaces:**
- Consumes: `getSupabase()`, `launchesView`/`launchesActions`, tipos.
- Produces: `getLaunchesOverview(): Promise<LaunchesOverview>` (lee `scheduled_posts` + `cron_runs` + `cron_log_events` + `deploy_events` + join con clientes/jobs para título/thumbnail, reusando lo de `contentTrackerService`); `subscribeLaunches(onChange): () => void` (realtime sobre las 4 tablas); wrappers `callRetry/callForce/callRunTick/callCancel/callReschedule(args, accessToken)` que pegan a `api/launches/*` con el Bearer de la sesión.

- [ ] **Step 1:** Implementar `getLaunchesOverview` (Promise.all, error de tablas de salud aislado como hace `contentTrackerService` con `scheduled_posts`), `subscribeLaunches`, y los wrappers de acción (toman el `access_token` de `supabase.auth.getSession()`).
- [ ] **Step 2: Verify:** una prueba de humo en el front (o `tsx` script) que llame `getLaunchesOverview()` contra Supabase y devuelva la fila de prueba con su estado.
- [ ] **Step 3:** `node --import tsx --test` de cualquier parte pura extraída → PASS.
- [ ] **Step 4: Commit** (`feat(lanzamientos): servicio de datos + realtime + wrappers de acción`).

---

### Task 10: UI — página "Lanzamientos" + nav + banner + acciones

**Files:**
- Create: `src/components/admin/launches/LaunchesTab.tsx`, `HealthBanner.tsx`, `LaunchRow.tsx`, `RunTickConfirm.tsx`
- Modify: `src/components/admin/AdminLayout.tsx` (nuevo item "Lanzamientos" bajo "Marketing & Campañas"), router admin.

**Interfaces:**
- Consumes: `launchesService` (Task 9), `launchesView`/`launchesActions` (Tasks 2/3).
- Produces: pantalla gateada a rol `admin` (`vendedor` read-only: ve el tablero, sin botones de acción — decisión del builder confirmada aquí: read-only). Banner de salud (estado cron por `computeCronHealth`, deploy actual, errores de infra recientes, botón "Correr tick ahora" con `RunTickConfirm` que enumera N piezas/clientes). Lista de filas con timeline, error, y acciones por `canRetry/canCancel/…`. Botón "ver logs del tick" → `cron-logs`. Realtime vía `subscribeLaunches`.

- [ ] **Step 1:** Construir los componentes con los tokens del tema (dark+violeta), sin tocar motion (guardrail chrome-only). Acciones con confirmación donde publican.
- [ ] **Step 2:** Agregar el item de nav + ruta, gateado por rol.
- [ ] **Step 3: Verify:** `node scripts/test_frontend_integrity.js` (cero globals desconocidas, estudios renderizan) y `vite build` OK. Prueba manual: abrir Lanzamientos, ver la fila publicada, el banner en verde; forzar un estado de error y ver el reintentar.
- [ ] **Step 4: Commit** (`feat(lanzamientos): UI del tablero + nav + banner + acciones`).

---

### Task 11: Setup de infra en Vercel (Log Drain + Deployment Webhooks + env vars)

**Files:** — (ops, no código; documentar en el spec/README)

**Interfaces:**
- Produces: un Log Drain (team-level, JSON) → `https://creapp.com.ar/api/vercel/log-drain` con secreto; un Webhook de deployment → `/api/vercel/deploy-hook` con secreto; env vars del proyecto portal: `VERCEL_TOKEN` (read de logs), `VERCEL_LOG_DRAIN_SECRET`, `VERCEL_WEBHOOK_SECRET`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`.

- [ ] **Step 1:** Crear el Log Drain y el Webhook vía la API/MCP de Vercel apuntando a los endpoints de Task 8; guardar los secretos.
- [ ] **Step 2:** Cargar las env vars en el proyecto `creapp-web-page` (production) y redeploy.
- [ ] **Step 3: Verify:** provocar un deploy → aparece fila en `deploy_events`; provocar/forzar un error del cron → aparece en `cron_log_events` vía el drain.
- [ ] **Step 4:** Documentar los valores (sin secretos) en el spec.

---

## Notas de ejecución

- Orden sugerido: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. Tasks 2/3/7 (puras) pueden ir en paralelo. Task 11 (infra) puede hacerse apenas Task 8 esté deployada.
- Dos repos: casi todo en el portal; el motor solo toca el `.sql` de schema (Task 1, step 4) y conviene verificar que su modelo Pydantic de `scheduled_posts` tolere la columna `permalink` (extra ignore) — si no, un ajuste chico en el motor.
