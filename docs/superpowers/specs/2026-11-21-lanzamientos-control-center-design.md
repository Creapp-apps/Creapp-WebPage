# Diseño — "Lanzamientos": Centro de Control de Publicaciones (2026-11-21)

## Intención y por qué

Hoy programamos piezas a Instagram/Facebook vía la cola `scheduled_posts`
(Supabase) + el cron de Vercel (`api/cron/publish-queue.ts`). El 2026-11-21
descubrimos que el cron venía **crasheando en cada tick** (`ERR_MODULE_NOT_FOUND`)
durante ~10 h **sin dejar rastro visible**: la fila quedaba muda en `queued`, sin
error, y nadie se enteraba hasta mirar los logs de Vercel a mano.

"Lanzamientos" es un **tablero de control operativo** (no un visor pasivo) en el
portal CREAPP OS, bajo "Marketing & Campañas", para:

1. Ver en tiempo real el estado de todo lo programado/publicado, de todos los clientes.
2. Entender **por qué** falló una pieza — tanto errores de Meta como caídas de infra.
3. **Actuar**: reintentar, forzar la corrida ahora, cancelar, reprogramar, verificar.
4. Detectar fallas de **infra** (cron caído, fila trabada) con la mayor precisión posible.

## Objetivos

- Pantalla única, realtime, multi-cliente, con el estado por pieza y su línea de tiempo.
- Doble detección de fallas: (a) **error de fila** (Meta rechazó, `error_message`),
  (b) **falla de infra** (cron no latió / crasheó / fila trabada sin avanzar).
- Acciones admin: **reintentar**, **forzar ahora**, **cancelar**, **reprogramar**,
  **previsualizar** la pieza y **abrir el post publicado**.
- Salud del cron y del deploy de producción, en vivo, empujada desde Vercel.
- Seguridad: toda acción valida sesión **admin** del lado server (nunca abierta).

## No-objetivos

- No es un dashboard general de observabilidad de Vercel (el tab "NOC & Telemetría"
  ya cubre telemetría de dispositivos; esto es sólo salud del pipeline de publicación).
- No cambia el mecanismo de publicación (cola + cron + Meta Graph) ni el motor.
- No agrega plataformas nuevas más allá de lo que `scheduled_posts.platform` ya soporta.
- No programa ni publica en batch (sigue vigente "OK por pieza" de AGENTS.md); las
  acciones son individuales y explícitas.

## Anti-objetivos (qué lo haría un fracaso aunque "funcione")

- Que una acción **publique sin intención clara del admin** (p. ej. "forzar ahora"
  silencioso): toda acción que pueda publicar debe ser explícita, rotulada y confirmada.
- Que la detección de infra repita el agujero de hoy: un cron caído **debe gritar**,
  no quedar invisible.
- Endpoints de acción **abiertos** (como los `send-*` actuales, sin auth): acá no.

## Restricciones

- El browser **no puede** tener `VERCEL_TOKEN`, `CRON_SECRET` ni `SUPABASE_SERVICE_ROLE_KEY`.
  Todo lo privilegiado pasa por funciones serverless del portal (`api/...`).
- Los payloads de Log Drain y de Deployment Webhooks de Vercel deben verificarse
  (firma/secreto) antes de confiar en ellos.
- `scheduled_posts` ya tiene realtime + RLS (lectura admin/vendedor) aplicados; se reusa.
- Los endpoints admin existentes (`api/send-campaign-update.js`, etc.) **no** validan
  sesión (CORS `*`, sólo params). Los nuevos **no** deben seguir ese patrón.
- Toda función TS en `/api` importa con extensión `.js`, nunca `.ts` (ver fix 2026-11-21).

## Enfoques considerados

Para la **señal de infra** (la de Vercel) se evaluaron tres caminos:

- **A — Latido auto-reportado (Supabase-native):** el cron escribe su propio heartbeat
  en una tabla `cron_runs`. Barato, realtime por el canal de Supabase existente, y la
  *ausencia* de latido detecta el crash de import. Limitación: si crashea en el import
  no puede auto-reportar el "por qué" (sólo la ausencia).
- **B — Log Drain → webhook → Supabase (push, directo de Vercel):** Vercel empuja cada
  línea de log a un endpoint del portal, que parsea y guarda los eventos de infra
  (incluido el stack de un crash). Realtime real, captura el "por qué" aun en crashes de
  import. Más plomería (configurar el drain, verificar firma, parsear logs).
- **C — Pull REST bajo demanda:** una función del portal consulta la API de runtime-logs
  de Vercel. Sin infra nueva, pero es polling (no realtime) y choca con retención de logs.

**Elegido (decisión del usuario, 2026-11-21): A + B + Deployment Webhooks, completo.**
Razonamiento: A da liveness/conteos baratos y realtime y detecta "fila trabada" y "cron
sin latir"; B agrega el canal realtime de **errores de infra con stack** empujado por
Vercel (lo más preciso y lo más "directo de Vercel" posible); los Deployment Webhooks
correlacionan "empezaron los errores justo con este deploy". **C** queda como botón de
**forense a demanda** ("ver logs del tick"). Se prioriza funcionalidad y eficacia sobre
rapidez de entrega. **La CLI/MCP de Vercel es la capa de ops del equipo (Claude en el
chat), NO corre dentro del feature.**

## Diseño

### Arquitectura en una frase

Dos señales realtime convergen en Supabase y el front las lee por el mismo canal:
(1) **estado por pieza** → `scheduled_posts` (lo escribe el cron); (2) **salud de infra**
→ `cron_runs` (heartbeat auto-reportado) + `cron_log_events` (Log Drain) +
`deploy_events` (webhooks). Las acciones del admin pasan por funciones serverless del
portal, autenticadas por JWT de Supabase + rol `admin`, que mutan con service role.

**Alcance y publicador único (confirmado):** "Lanzamientos" monitorea el **camino cloud**
(filas de `scheduled_posts`). Para esas filas, el **cron de Vercel es el ÚNICO publicador**:
el motor en modo `cloud_supabase` solo **encola** (`scheduler.py`; el dispatch en bloque y
el "Set & Forget" están deshabilitados para cloud), y su `meta_graph_api.py` se usa solo
para clientes **local-mode** (publican en la PC, NO usan `scheduled_posts`). Por eso el
heartbeat `cron_runs` cubre el 100% del camino que esta pantalla vigila. Clientes
local-mode y el publicador legacy de GitHub Actions (otra fuente de datos, un cliente fijo)
quedan **fuera de alcance** de v1.

### Modelo de datos (Supabase, migraciones nuevas)

**`cron_runs`** (heartbeat auto-reportado por el cron):
- `id` uuid pk, `cron_name` text (`'publish-queue'`), `started_at` timestamptz,
  `finished_at` timestamptz null, `outcome` text null (`'ok'|'error'`),
  `processed_count` int, `published_count` int, `error_count` int,
  `error_text` text null, `deployment_id` text null, `git_sha` text null.
- El handler inserta la fila `started` al inicio y la actualiza (`finished_at`,
  `outcome`, conteos) al final. Si crashea **a mitad** → `finished_at` queda null
  (detectable). Si crashea en el **import** → no hay fila (ausencia = cron caído).
- RLS: lectura `admin`/`vendedor`. Realtime ON.

**`cron_log_events`** (del Log Drain; sólo líneas de infra relevantes):
- `id` uuid pk, `received_at` timestamptz, `deployment_id` text, `request_id` text null,
  `level` text, `message` text (línea/stack), `request_path` text, `raw` jsonb.
- El webhook filtra a `request_path` del cron + `level in (error,fatal)` antes de insertar
  (no guardamos todo el firehose). RLS lectura admin/vendedor. Realtime ON.

**`deploy_events`** (de Deployment Webhooks):
- `id` uuid pk, `received_at`, `type` text (`deployment.succeeded|.error|.ready`),
  `deployment_id`, `git_sha`, `state`, `raw` jsonb. RLS lectura admin/vendedor. Realtime ON.

**`scheduled_posts`** (alteraciones) — **la tabla la crea/posee el MOTOR**
(`src/integrations/supabase_scheduled_posts_schema.sql`), `status` es **`text`**
(NO enum Postgres), así que no hay `ALTER TYPE`:
- Agregar `permalink` text null — el cron lo escribe al publicar (campo `permalink` del
  media de Meta, misma llamada de publish o un GET corto). Para "abrir el post".
  Verificar que el modelo Pydantic del motor tolere la columna nueva (extra ignore) al
  leer/re-sincronizar — builder.
- **Cancelar reusa el valor existente del motor: `status='cancelled'`** (doble L, como
  `SupabaseSync.cancel_scheduled_post`), NO un valor nuevo. Así se evita el gotcha
  "enums estrictos → 500" (el motor ya produce y entiende `'cancelled'`).
- `updated_at` existe con `DEFAULT now()` pero eso **solo aplica en INSERT**; el cron no
  lo toca en los UPDATE (se verificó: quedó clavado tras containerizar). Agregar un
  **trigger BEFORE UPDATE** que lo refresque (necesario para el cálculo de "trabada").
- Migraciones de columna/trigger: en el repo **portal** (`supabase/migrations/`, hay
  precedente: `20261120204457_scheduled_posts_rls_realtime.sql`), idempotentes
  (`ADD COLUMN IF NOT EXISTS`). Actualizar también el `.sql` de schema del motor por
  coherencia.

### Cableado de Vercel

1. **Heartbeat (A):** modificar `api/cron/publish-queue.ts` para escribir `cron_runs`
   (start/end) con service role. Incluir `deployment_id`/`git_sha` desde
   `process.env.VERCEL_DEPLOYMENT_ID` / `VERCEL_GIT_COMMIT_SHA`.
2. **Log Drain (B):** crear un Log Drain JSON (team-level; vía API de Vercel / MCP en el
   setup) apuntando a `POST /api/vercel/log-drain`. El endpoint **verifica la firma del
   drain** (secreto configurado al crearlo), filtra a cron-path + error/fatal, inserta en
   `cron_log_events`.
3. **Deployment Webhooks:** crear webhook (`deployment.succeeded/.error/.ready`) →
   `POST /api/vercel/deploy-hook` → verifica firma → inserta en `deploy_events`.

   **Verificación de firma (contrato, confirmar contra la doc viva de Vercel al construir
   — no hay precedente en el repo):** Webhooks de Vercel firman con **HMAC-SHA1 del raw
   body** en el header `x-vercel-signature`; los Log Drains llevan su propio secreto
   configurable. En ambos hay que leer el **raw body sin parsear** antes de verificar
   (en funciones de Vercel, desactivar el body-parser o leer el stream). Un esquema mal
   adivinado deja el endpoint roto o, peor, abierto → viola el anti-objetivo. Guardar los
   secretos como env vars del proyecto portal.
4. **Forense (C):** `GET /api/launches/cron-logs?deploymentId=...` (admin-authed) que hace
   proxy a `/v1/projects/{id}/deployments/{dep}/runtime-logs` con `VERCEL_TOKEN` server-side.

### Endpoints de acción (serverless, admin-authed, service role)

Patrón de auth común (helper nuevo `requireAdmin(req)`): el cliente manda
`Authorization: Bearer <access_token de Supabase>`; el endpoint valida con
`auth.getUser(token)`, resuelve el rol y exige `admin`; luego muta con service role.
CORS restringido al origen del portal. **El rol se resuelve igual que el cliente**
(`AuthContext.tsx`): `user_profiles.role === 'admin'` **O** el fallback de admin por
email por defecto (`isDefaultAdminEmail(user.email)`) — hay admins que operan sin fila
en `user_profiles`, y sin replicar ese fallback todas las acciones les darían 403.

- `POST /api/launches/retry` — resetea la fila a `queued`, limpia `error_message` y
  `container_id`. Válido desde `error` o `queued`/`containerizing` trabada.
- `POST /api/launches/force-run` — **acotado a UNA pieza** (`id` en el body). Avanza esa
  fila lo máximo posible en la llamada: si `queued` la containeriza; si `containerizing`
  consulta Meta; si `ready` y la hora llegó, publica. Rotulado "puede publicar", con
  confirmación. Es el bisturí. **Implementación:** exponer un camino de una sola fila en la
  lógica del cron y llamarlo con esa `id` (el handler actual procesa TODAS las filas due;
  invocarlo sin filtro publicaría piezas no elegidas).
- `POST /api/launches/run-tick` — **"correr el tick ahora" (global, recuperación).**
  Ejecuta el handler del cron completo una vez: adelanta el tick automático que corre cada
  15 min. **No autoriza publicaciones nuevas** — cada pieza de la cola ya tuvo su OK al
  programarse; esto solo ejecuta antes lo ya aprobado (mismo filtro `ready`/due que el
  cron). Es la herramienta de recuperación tras una caída (destrabar el backlog de un
  click). **Barandas:** admin-only, y **confirmación que enumera cuántas piezas y de qué
  clientes se van a correr** antes de ejecutar. No colisiona con AGENTS "nada en batch"
  (esa regla es sobre *aprobar/programar* en bloque, no sobre ejecutar lo ya aprobado).
- `POST /api/launches/cancel` — `status='cancelled'` (match motor) sólo desde
  `queued`/`containerizing`/`ready` (nunca `publishing`/`published`/`cancelled`). Espeja
  la guarda de `SupabaseSync.cancel_scheduled_post` del motor.
- `POST /api/launches/reschedule` — actualiza `scheduled_at` **y resetea la fila a
  `queued`** (limpia `container_id`) si venía de `ready`, para re-containerizar: un
  container de Meta expira (~24 h) y publicar con uno viejo fallaría.

### UI (portal, nuevo nav "Lanzamientos" bajo "Marketing & Campañas")

- **Banner de salud (arriba):** estado del cron (último latido ok y hace cuánto; verde si
  < ~18 min y `ok`, rojo si rancio/ausente o último `outcome=error`), deploy de producción
  en vivo (sha + estado), y errores de infra recientes del drain. Incluye el botón global
  **"Correr tick ahora"** (`run-tick`, recuperación tras caída) con su confirmación que
  enumera piezas/clientes.
- **Lista de lanzamientos:** todas las filas de `scheduled_posts`, filtrable por cliente y
  estado. Por fila: cliente, pieza (título del job + thumbnail del asset), plataforma,
  `scheduled_at`, chip de línea de tiempo de estado, error (si hay), y acciones
  (reintentar / forzar / cancelar / reprogramar / previsualizar / abrir post).
- **Detección de "trabada" (client-side):** `queued`/`containerizing` sin cambiar por
  > ~20 min **con** heartbeat sano → fila trabada (reintentable); si el heartbeat está
  rancio/ausente → banner "cron caído" por encima de todo.
- **Forense:** botón "ver logs del tick" → `GET /api/launches/cron-logs`.
- **Realtime:** suscripción Supabase a `scheduled_posts`, `cron_runs`, `cron_log_events`,
  `deploy_events` (extender `subscribeTracker` o un servicio `launchesService` nuevo).
- **Estética:** sistema dark + violeta del Content Studio (tokens existentes); guardrail
  chrome-only (no tocar motion). Gate `test_frontend_integrity`.

### Umbrales (calls del diseño, tunables)

- "Fila trabada": sin cambio de estado por > 20 min (≈ 1 tick perdido + margen).
- "Heartbeat rancio": sin `cron_runs.finished_at` con `outcome=ok` en > 18 min (cron es
  `*/15`).

## Qué queda al builder

- Layout/estilo fino de la pantalla (respetando el tema y el guardrail chrome-only).
- El parseo exacto de las líneas del Log Drain (formato JSON del drain de Vercel) para
  decidir qué es "error de infra del cron".
- Si `vendedor` ve el tablero en sólo-lectura (sin acciones) o no lo ve.
- Valores finos de los umbrales y la cadencia de refresco del banner.
- La mecánica exacta de `force-run` (proxy HTTP con `CRON_SECRET` vs invocar el handler).

## Pendientes de infra (setup, fuera del código)

- Crear el **Log Drain** y los **Deployment Webhooks** en Vercel (vía API/MCP) y cargar
  sus secretos de verificación + `VERCEL_TOKEN` como env vars del proyecto portal.
