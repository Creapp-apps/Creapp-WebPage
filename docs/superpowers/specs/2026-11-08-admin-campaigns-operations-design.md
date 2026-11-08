# Admin "Campañas de Contenido" — de visor a centro de operaciones — Design

**Fecha:** 2026-11-08
**Estado:** borrador para aprobar
**Base:** la sección admin "Marketing & Campañas → Campañas de Contenido" (Plan 4, ya mergeado) hoy es un **visor en vivo**: lee los jobs que el motor pushea y muestra estado de aprobación por pieza. Este diseño la convierte en el **centro de operaciones de campañas**: estructura por campaña, acción desde el admin (enviar, responder), y estado de producción traído del motor.

## Intención y porqué

La agencia produce las piezas en el motor local (Creador de Contenidos) y las revisa el cliente en el portal. Hoy el equipo ve el resultado de la aprobación pero no puede **operar** desde CreAPP: no controla qué ve el cliente ni cuándo, no puede responderle sin salir, y no ve en qué anda la producción. El objetivo es que todo el ciclo —preparar, enviar, conversar, seguir render— viva bajo un mismo techo, sin saltar entre herramientas.

## Decisiones del usuario (2026-11-08)

1. **Hilo bidireccional** equipo ↔ cliente por pieza (no solo marcar atendido).
2. **Borrador → enviar**: la pieza entra oculta al cliente; se hace visible con un botón *Enviar al cliente*.
3. **Agrupar por campaña** (slug del motor) con **estado vigente/cerrada** + progreso X/Y aprobadas.
4. **Push de estado de producción** desde el motor: etapa del pipeline + renderizada sí/no.
5. Features aparte, no en este alcance: alertas persistentes (campana/FCM/email) y publicar a IG/TikTok. Quedan para un diseño posterior.

## Goals

- **Estructura:** cliente → campañas (card por slug) con mes, estado vigente/cerrada y progreso; dentro, las piezas. Filtros (pendientes/atención primero) y buscador de cliente.
- **Control de visibilidad:** toda pieza que el motor pushea entra como **borrador** (invisible al cliente). El equipo la revisa y aprieta *Enviar al cliente* para publicarla en el portal. Se puede **despublicar**.
- **Hilo por pieza:** equipo y cliente conversan en un hilo cronológico que incluye las decisiones de aprobación ("pidió cambios: …"). El cliente lee las respuestas del equipo en el portal y escribe las suyas.
- **Estado de producción:** cada card muestra etapa (guion → voz → broll → render → QA → listo) y si la pieza está renderizada, empujado por el motor.
- **Atajos de operación:** *Abrir en el portal* (ver la pieza como el cliente) y *Abrir en Estudio* (link al job del motor por `job_id_motor`).
- Todo en vivo (Realtime, ya operativo) y respetando RLS: equipo lee/escribe lo de todos; cliente solo lo suyo.

## Non-goals

- No se toca el motor de render ni la generación de piezas; solo se le agrega qué campos pushea.
- No se construye alertas persistentes ni publicación a redes en este alcance.
- No se impersona al cliente: *Abrir en el portal* es una vista de preview del equipo, no un login como cliente.
- No se edita la pieza desde CreAPP (eso sigue en el Estudio del motor).

## Anti-goals (sería un fracaso si…)

- …una pieza en borrador se filtra al cliente antes de *Enviar* (fuga de RLS). La invisibilidad del borrador es la invariante más dura.
- …el equipo puede escribir en nombre del cliente o viceversa en el hilo (suplantación).
- …el admin muestra datos técnicos crudos del motor al cliente (el portal sigue siendo cinematográfico, sin `job_id_motor` ni etapas internas).
- …el tablero deja de actualizarse en vivo o pierde el aislamiento por cliente que ya tiene.

## Constraints

- Un repo para la UI: **CreAPP** (React 19 + TS + Vite + Tailwind + Supabase). Estética admin (dark), portal navy intacto.
- El **motor** (Python) solo cambia en su capa de push (`src/integrations/portal_push.py` + `supabase_sync.py`). `service_role` **solo** en el `.env` del motor, nunca en el front. El front usa anon + RLS.
- No romper el tracker actual ni el routing `?tab=content_campaigns`.
- Copy es-AR. Logos reales (de `clients.logo_url`) o nombre en serif, nunca monograma genérico (ya resuelto en Plan 3/4).
- `git add` solo archivos propios (hay WIP del usuario en el working tree de CreAPP).
- Migraciones las aplica el usuario en el SQL Editor (proyecto `yjrqpjlzyxivwpfcatvt`), como en los planes previos.

## Cómo se construye (lo decidido)

Tres subsistemas. Se parten en planes de ejecución después de aprobar este diseño.

### 1. Datos y RLS (Supabase)

- **`content_jobs`** gana: `client_visible boolean not null default false`, `sent_at timestamptz`, `production_stage text` (enum textual: `guion|voz|broll|render|qa|listo`), `rendered boolean not null default false`.
  - **RLS portal:** la política de lectura del cliente se estrecha a `client_visible = true`. El equipo sigue viendo todo (borradores incluidos). Esta es la invariante anti-fuga: se prueba con un test de RLS (cliente NO ve un job con `client_visible=false`).
- **`content_campaigns`**: se usa el `status` ya existente con valores `active|closed` (vigente/cerrada). El progreso X/Y se **deriva** en el front desde las piezas; no se persiste.
- **Nueva tabla `content_messages`** (hilo bidireccional): `id`, `job_id` (fk), `author_role text` (`team|client`), `author_user_id uuid` (fk a `user_profiles`), `body text`, `created_at`.
  - **RLS:** el equipo (admin/vendedor) lee y escribe en cualquier fila. El cliente lee/escribe solo filas de jobs de su cliente (vía la membresía `client_members` del Plan 2) y solo con `author_role='client'` y `author_user_id = auth.uid()` (no puede falsear rol ni autor). El equipo escribe solo con `author_role='team'`.
  - El **hilo mostrado** fusiona, por orden de `created_at`, los `content_messages` y las filas de `content_approvals` (la decisión "pidió cambios/aprobó" con su comentario) del mismo job.
- **Realtime:** agregar `content_messages` a la publicación `supabase_realtime` (micro-migración, como la del Plan 4).

### 2. Motor (capa de push)

- `portal_push.py`: al upsert del job, setear `client_visible=false` (borrador) salvo que ya estuviera enviado (no pisar un `true` existente). Subir `production_stage` y `rendered` leídos de `job_state.json` / artefactos del job.
- Mantener idempotencia: re-pushear un job actualiza etapa/render sin cambiar `client_visible` ni `sent_at`.
- `supabase_sync.py`: extender `upsert_job` con los campos nuevos.

### 3. UI

**Admin — `ContentCampaignsTab` y subcomponentes (estética dark):**
- Agrupar piezas por **campaña** (card por `campaign.slug`): título/mes, chip vigente/cerrada, progreso `X/Y aprobadas`, contadores (aprobadas · pidieron cambios · sin revisar · en borrador).
- Expandir campaña → filas de pieza con: estado de aprobación, **badge de producción** (etapa + render), **badge borrador/enviada**.
- Acciones por pieza: *Enviar al cliente* (si borrador) / *Despublicar*; *Abrir en el portal* (preview); *Abrir en Estudio* (`http://localhost:8000/...?job=<job_id_motor>`); abrir el **hilo** (ver + responder como equipo).
- Filtros: atención-primero (pidieron cambios arriba), por cliente; buscador.
- Cerrar/reabrir campaña (`status active|closed`) desde la card.

**Portal — pieza (estética navy, intacta):**
- Solo piezas `client_visible=true` (ya garantizado por RLS; el service del portal no cambia su forma, solo recibe menos filas).
- **Hilo por pieza**: el cliente lee las respuestas del equipo y escribe las suyas, integrado con el flujo de aprobar/pedir cambios que ya existe.

## Lo que queda al builder (plan de ejecución)

- Nombres exactos de columnas/políticas y el orden de las migraciones.
- La forma exacta del merge approvals+messages en el hilo (una vista SQL vs. merge en el front).
- Reutilizar los helpers puros del tracker (`contentTrackerMapper`, `contentTrackerView`) extendiéndolos, no duplicando.
- Decidir si *Enviar al cliente* escribe también una entrada de sistema en el hilo ("pieza enviada").
- La URL exacta del Estudio del motor (confirmar ruta real en `src/web`).

## Resolución del builder-check (2026-11-08)

**Decisiones del usuario:**
- **Disparo del push:** manual, al terminar la pieza. `production_stage` es un **snapshot** del estado al momento del push, no un flujo en vivo por paso. El motor no gana hooks por etapa.
- **Borradores en R2:** se aceptan **URLs públicas con UUID** no adivinable. RLS oculta la fila; el UUID cubre el descubrimiento. Sin firmar URLs. (El riesgo residual —tener la URL exacta de un borrador— se asume; queda anotado, no se mitiga con trabajo extra.)
- **Nueva versión tras "pidió cambios":** un re-push de assets nuevos **resetea la pieza a "sin revisar"** y exige *Enviar* de nuevo. Se deriva: si `sent_at` (o la fecha del nuevo render) es posterior a la última `content_approvals`, el estado vuelve a "sin revisar".

**Decisiones de builder (mías, no cambian lo pactado):**
- **Backfill (Q1):** la migración setea las filas existentes de `content_jobs` a `client_visible=true`, `sent_at=created_at`, para no ocultar lo que el cliente ya ve hoy. Sin coordinación de release.
- **Mapping de etapa (Q3):** `rendered = tiene asset final` (mp4 para reel/film, slides para carrusel). `production_stage`: para reels con pipeline, la última etapa alcanzada en `job_state.json`; para films/carruseles hand-authored (sin pipeline de voz/broll), un set reducido `borrador|listo|enviado`. Se calcula en el push.
- **"Atención" (Q6):** no se agrega flag; se deriva. Una pieza está "en atención" si su última acción es del cliente ("pidió cambios") sin respuesta del equipo ni re-envío posterior. La limpia una respuesta del equipo en el hilo o un `sent_at` posterior (nueva versión).
- **Preview del equipo (Q7):** ruta admin de preview que arma la vista del portal leyendo con las **policies de equipo** (que ya ven todo). No impersona al cliente ni usa su sesión.
- **Escritura y policies (Q8):** en el hilo, cualquier **miembro** del cliente escribe (`author_role='client'`, `author_user_id=auth.uid()`, forzado por `with check`); del lado equipo escriben **admin y vendedor** (`author_role='team'`). Nuevas policies **UPDATE column-restricted**: el equipo solo puede tocar `content_jobs.client_visible/sent_at` y `content_campaigns.status`; nunca los campos que escribe el motor (`job_id_motor`, `production_stage`, `rendered`, assets).

## Review focus (lo que más puede morder)

- **Fuga de borrador:** un cliente que llega a un job `client_visible=false` por cualquier vía (query directa, Realtime, asset url). Se prueba con RLS.
- **Suplantación en el hilo:** cliente que inserta `author_role='team'`, o equipo que escribe en un job de otro. RLS con `with check`.
- **Re-push pisando estado:** un re-push del motor que vuelva a `client_visible=false` una pieza ya enviada. La lógica de upsert no debe pisar.
- **Campaña sin piezas / pieza sin campaña:** estado vacío elegante, sin romper el agrupado.
- **Realtime del hilo:** mensajes nuevos aparecen sin refresh y respetan RLS (el cliente no recibe mensajes de otro cliente).
