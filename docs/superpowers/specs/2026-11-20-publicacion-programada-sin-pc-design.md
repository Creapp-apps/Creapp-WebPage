# Publicación programada a Meta sin dependencia de PC encendida

## Intención y por qué

CreAPP arma piezas (reels, historias, carruseles) para múltiples clientes. Hoy,
sacar una pieza aprobada requiere una de dos cosas: cargarla a mano en Meta
Business Suite pieza por pieza, o tener el motor local (`src/core/scheduler.py`)
corriendo exactamente a la hora programada, porque es un thread con polling
cada 30s que vive en la máquina del equipo. Eso obliga a mantener la
computadora encendida en el horario exacto de cada publicación, lo cual no es
viable para programar una campaña entera con antelación.

El objetivo de este diseño es que, una vez aprobada una pieza desde CreAPP
(con su OK individual de siempre), la publicación real a Instagram/Facebook
ocurra sola, en la nube, sin que ninguna máquina del equipo necesite estar
encendida en el momento exacto del publish.

## Goals

- Eliminar la dependencia de "PC prendida a la hora exacta" para que una
  pieza aprobada salga publicada.
- Mantener intacta la norma de gobernanza del motor (`AGENTS.md`, sección MCP
  del motor): cada pieza sigue pidiendo su propio OK explícito antes de
  encolarse. No hay programación en batch real — un prompt puede acelerar la
  secuencia de aprobaciones, pero cada una se sigue confirmando individualmente.
- Reusar el código ya probado (`src/integrations/meta_graph_api.py`,
  `src/integrations/cloud_storage.py`) en vez de reescribir la integración
  con Graph API desde cero.
- Un token de acceso no-expirable por cliente/cuenta, generado una vez, sin
  lógica de refresh automático (ver Approaches).
- Que el calendario de CreAPP (la vista tipo planner que ya existe en la
  suite) refleje el estado real de cada pieza encolada: programada → container
  listo → publicada / error.

## Non-goals

- No se busca reflejar las piezas dentro del Planner nativo de Meta Business
  Suite. Se investigó y no existe API pública para Instagram que escriba ahí;
  ningún competidor (Later, Buffer, Hootsuite, Metricool) lo hace tampoco.
- No se construye en esta fase el refresh automático de tokens de 60 días
  (Approach B). Queda documentado como fallback, no como trabajo de esta
  iteración.
- No cambia la plataforma de render: sigue siendo local (Remotion/GPU).
- No se automatiza TikTok/YouTube Shorts en esta fase — hoy están simulados
  en `social_publisher.py`; el foco es Meta (Instagram + Facebook).

## Anti-goals (qué sería un fracaso aunque "funcione")

- Que una pieza se publique sin que un humano la haya aprobado
  explícitamente — violaría la norma de OK individual del motor.
- Que un token de acceso quede guardado en texto plano en el repo en vez de
  como variable de entorno segura en Vercel.
- Que el bucket público de R2 (`creador-contenidos-media`, usado para que
  Meta descargue medios) se mezcle con el bucket privado de sync
  (`R2_PRIVATE_BUCKET`, usado por `sync_core.py`/`snapshots.py`). Hoy están
  separados; el diseño no debe romper esa separación.
- Que una pieza falle en silencio: si algo se traba (token inválido, video
  rechazado, error de Meta), tiene que quedar visible en el calendario de
  CreAPP, no perderse.

## Constraints (confirmadas durante la investigación de esta conversación)

- El container de medio de Instagram **expira a las 24h** de creado
  (`_wait_for_container_ready`, `meta_graph_api.py:352-369`, y confirmado
  contra la doc oficial de Meta). No se puede crear un container con semanas
  de anticipación y dejarlo esperando.
- La función de Vercel **no tiene acceso al filesystem local**. El asset
  (`.mp4`/`.png`) tiene que estar ya en R2, con URL pública, antes de que el
  cron intente containerizar. Hoy `_resolve_public_url` (`meta_graph_api.py:
  304-334`) sube el archivo a R2 de forma automática si recibe una ruta
  local — pero esa subida solo puede pasar mientras el archivo sigue en
  disco, es decir, en el momento del OK (máquina local), no después.
- No existe scheduling nativo documentado de Meta para **Instagram** vía
  Graph API (verificado contra `developers.facebook.com/docs/
  instagram-platform/content-publishing/`: la página no documenta
  `scheduled_publish_time` para `/{ig-user-id}/media`, y el único mecanismo
  oficial es llamar `media_publish` explícitamente). Alguien tiene que
  ejecutar esa llamada en el momento justo.
- **Facebook sí** soporta `scheduled_publish_time` nativo y documentado para
  `/{page-id}/video_reels` y `/{page-id}/feed` (con `video_state:
  "SCHEDULED"`), ejecutado enteramente en la infraestructura de Meta. Se
  puede usar como camino nativo para contenido de Facebook, sin pasar por el
  cron propio.
- Vercel Pro: hasta 40 cron jobs, intervalo mínimo de 1 vez por minuto
  (confirmado vía skill `cron-jobs`).
- `publish_reel`/`publish_carousel` (`meta_graph_api.py`) esperan hasta 180s
  de forma sincrónica a que el container llegue a `FINISHED` antes de
  publicar — entra cómodo dentro de los límites de duración de una función
  serverless.
- Tipos de token de Meta tienen vencimientos distintos: un Page Access Token
  derivado de un User Token de larga duración no vence (solo se invalida por
  cambio de contraseña o revocación manual); un token de Instagram Login
  vence a los 60 días y requiere refresh activo
  (`developers.facebook.com/docs/facebook-login/guides/access-tokens`).

## Approaches considerados

### Token de Meta

- **A — elegido:** Page Access Token de larga duración (o System User token
  vía Meta Business Manager), no-expirable, generado una vez por
  cliente/cuenta y guardado como variable de entorno en Vercel
  (`META_ACCESS_TOKEN__<client_id>`). Cero lógica de refresh automático.
- **B — fallback, no se construye ahora:** si algún cliente puntual solo
  puede emitir un token de 60 días (restricción de su propia cuenta/setup de
  Business Manager), se suma un cron mensual separado que llama
  `GET /refresh_access_token` antes del vencimiento y actualiza la variable
  en Vercel. Queda documentado acá para no tener que rediseñar si aparece el
  caso, pero no es parte del alcance de esta iteración.

### Forma de la función/cron (decisión de implementación, sin trade-off fuerte en contra)

- Elegido: **una sola función serverless Python en Vercel**, invocada por un
  único cron (cada 15 min), que en cada tick resuelve las fases sobre la
  cola en Supabase (ver Diseño, sección 3). Se prefiere sobre tener funciones
  separadas por fase porque es más simple de mantener y de debuggear, y no
  hay beneficio real en separarlas: el volumen de piezas por campaña es bajo
  (decenas, no miles).

### Dónde se sube el asset a R2

- No es una elección real, es una constraint: tiene que subirse en el
  momento del OK, cuando el motor local todavía tiene el archivo en disco,
  reusando `CloudStorageManager`/`_resolve_public_url` ya existentes. La fila
  de Supabase guarda la **URL pública de R2 resultante**, nunca una ruta
  local — la función de Vercel jamás ve ni necesita el filesystem del
  equipo.

## Diseño

### 1. Tabla en Supabase: `scheduled_posts`

**Proyecto Supabase:** el mismo que ya usan los demás módulos de ops de
CreAPP (`sync_core.py`/`collab.py`, memoria `creapp-ops-modules-supabase.md`)
— no uno nuevo. La función Vercel del cron accede con la `service_role key`
(bypassa RLS, es backend de confianza, nunca se expone al cliente); no hace
falta una política RLS nueva para esta tabla porque nada del lado del
navegador la toca directamente. *(Mi call — un builder razonable podía
decidir esto solo; lo dejo explícito para que se pueda chequear.)*

Campos: `id`, `client_id`, `job_id`, `platform`
(`instagram_reel` | `instagram_carousel` | `instagram_story` |
`facebook_reel` | `facebook_feed`),
`media_r2_urls` (array — una o varias, para carruseles), `cover_r2_url`,
`caption`, `scheduled_at` (timestamptz), `status`
(`queued` | `containerizing` | `ready` | `publishing` | `published` | `error`),
`container_id` (nullable — id del contenedor final: el padre en carruseles,
el único en reels), `child_container_ids` (array, nullable — solo para
`instagram_carousel`), `published_media_id` (nullable), `error_message`
(nullable), `approved_by`, `approved_at`, `created_at`, `updated_at`.

**Historias — aclaración sobre las fases:** `publish_story`
(`meta_graph_api.py:428-446`) usa `media_type=STORIES` sobre el mismo
`_post_media_container`/`_publish_container` que un reel — un solo
contenedor, sin padre/hijo. `instagram_story` entra en la máquina de 3 fases
sin ningún cambio de esquema. Cada historia de la campaña (ej. las
intercaladas martes/jueves/sábado del calendario) es su propia fila en
`scheduled_posts`, con su propio `scheduled_at` — no se usa
`publish_story_sequence` (esa función publica varias de una sola vez, para
un caso distinto al de programar cada una en su día). *(Mi call.)*

**Carruseles — aclaración sobre las fases:** `publish_carousel` en
`meta_graph_api.py` ya arma los N contenedores hijos y el contenedor padre
en una sola llamada sincrónica (mismo patrón que `publish_reel`). La Fase 1
del cron reusa esa función tal cual para `instagram_carousel`: crea
hijos+padre de una sola pasada dentro del mismo tick y guarda solo el id del
padre en `container_id` (`child_container_ids` queda para debug/auditoría,
no para que el cron vuelva a leerlos en fases posteriores). *(Mi call.)*

### 2. Flujo de aprobación (`motor__programar_pieza`)

Al dar el OK sobre una pieza, el motor:

1. Resuelve el asset final ya renderizado y lo sube a R2 si no está (reusa
   `CloudStorageManager.upload_file` / `_resolve_public_url`).
2. Inserta una fila en `scheduled_posts` con `status: queued` y la URL
   pública de R2.
3. Confirma al usuario — sigue siendo una acción, un OK, por pieza. No
   cambia la norma de gobernanza existente.

### 3. Función Vercel (`api/cron/publish-queue.js`, runtime Node)

**Dónde vive:** dentro del repo real del portal, `Creapp-apps/Creapp-WebPage`
(`/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub`), no un
proyecto Vercel nuevo — decisión del usuario, 2026-11-20.

**Lenguaje — corrección sobre la versión anterior de este documento:** ese
repo es 100% Node/JS (`api/*.js`, patrón `export default async function
handler(req, res)`, confirmado en `api/telemetry-webhook.js` y
`api/send-campaign-update.js`, con Supabase server-side vía
`SUPABASE_SERVICE_ROLE_KEY` ya usado igual). No existe runtime Python en
todo el proyecto. En vez de reusar `meta_graph_api.py` tal cual (que habría
metido Python en un repo 100% Node), se porta a JavaScript la porción chica
de lógica que hace falta (crear container, consultar estado, publicar,
carrusel con padre/hijo) siguiendo el mismo patrón de los demás `api/*.js`
— decisión del usuario, 2026-11-20.

En cada tick del cron (cada 15 min):

- **Fase 1 — containerizar:** selecciona filas `status=queued` con
  `scheduled_at` dentro de las próximas ~20h. Para cada una, llama a la
  lógica equivalente a `_post_media_container` (reusando/portando
  `meta_graph_api.py`), pasando la URL de R2 ya guardada en la fila (nunca
  una ruta local). Guarda `container_id` y pasa `status` a `containerizing`.
- **Fase 2 — confirmar listo:** para filas en `containerizing`, consulta
  `status_code` del container; si `FINISHED` pasa a `ready`; si
  `ERROR`/`EXPIRED`, pasa a `error` con el detalle en `error_message`.
- **Fase 3 — publicar:** para filas `ready` con `scheduled_at <= now()`,
  llama `media_publish`, guarda `published_media_id`, pasa a `published`.
- **Autenticación del cron:** header `Authorization: Bearer $CRON_SECRET`
  (patrón estándar de Vercel Cron Jobs).
- **Token de Meta:** variable de entorno por cliente
  (`META_ACCESS_TOKEN__<client_id>`), no-expirable (Approach A).

### 4. Calendario en CreAPP

El calendario de la suite (la vista tipo planner que ya existe) lee
`scheduled_posts` y muestra el `status` real de cada pieza —
reemplaza o convive con el `storage/campaign_schedule.json` actual durante
la transición.

### 5. Facebook — camino nativo opcional

Para piezas de Facebook, en vez de pasar por la cola propia, se puede usar
directamente `scheduled_publish_time` + `video_state: "SCHEDULED"` en
`/video_reels` al momento del OK — Meta lo ejecuta en su propia
infraestructura, sin pasar por el cron. Se deja como posibilidad para quien
construya esto, no es obligatorio en esta fase.

## Qué queda para quien lo construya

- **Pre-flight obligatorio antes de prender el cron para un cliente ya
  conectado:** verificar con `GET /debug_token` el tipo del token guardado
  hoy en `client_manager.get_client_integrations` para ese cliente. No se
  puede asumir que los tokens ya cargados son Page tokens no-expirables
  (Approach A) — pueden ser tokens de Instagram Login de 60 días. Si no es
  un Page/System User token no-expirable, correr el runbook de abajo antes
  de activar el cron para ese cliente; si no se hace, el cron puede fallar
  en silencio a los 60 días para ese cliente puntual. *(Mi call — convierte
  una pregunta abierta del builder check en un paso explícito del rollout.)*
- Runbook puntual (documentado, no automatizado) para generar el Page/System
  User token no-expirable por cliente desde Meta Business Manager.
- Migración SQL de la tabla `scheduled_posts` en Supabase, con políticas RLS
  acordes al esquema que ya usan los otros módulos de ops de CreAPP.
- Decidir si `motor__programar_pieza` migra enteramente de
  `storage/campaign_schedule.json` a Supabase, o si conviven durante una
  transición. **Regla dura, no negociable, mientras conviven:** una misma
  pieza nunca puede quedar encolada en los dos sistemas a la vez — al
  activar el camino Supabase+Vercel para un cliente/campaña, esa pieza se
  saca de `campaign_schedule.json` (o ese cliente deja de pasar por
  `scheduler.py` local por completo). El riesgo real es doble-publicación en
  Instagram/Facebook, no es una decisión cosmética. *(Mi call.)*
- Portar a JavaScript las llamadas de `meta_graph_api.py` que hacen falta
  (`_post_media_container`, `_wait_for_container_ready`,
  `_publish_container`, y el padre/hijo de `publish_carousel`) a un módulo
  compartido dentro de `api/` del repo del portal, leyendo el token desde
  variable de entorno (no desde `client_manager` local, que no existe en
  ese repo).
- El calendario de CreAPP leyendo `scheduled_posts` (sección 4) queda
  explícitamente fuera del plan de construcción inicial — el lugar correcto
  (¿la propia suite local del motor, `src/web/static/index.html`, o el
  portal?) no está confirmado todavía. Se arma como plan aparte una vez que
  el circuito de cola→publish esté probado.
- Monitoreo mínimo: que una fila en `error`, o atascada demasiado tiempo en
  `containerizing`/`ready`, se vea como alerta visible en el calendario de
  CreAPP (alcanza con un badge rojo, no hace falta nada más sofisticado en
  esta fase).
