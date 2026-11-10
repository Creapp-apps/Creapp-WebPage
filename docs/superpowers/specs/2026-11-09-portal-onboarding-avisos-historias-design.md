# Diseño — Cerrar el loop de presentación al cliente: alta + acceso, avisos bidireccionales e historias

> Fecha: 2026-11-09. Parte de la fusión Creador→CreAPP (ver `2026-11-07-fusion-creador-creapp-design.md` y la memoria `fusion-creador-creapp`). Dos repos: **CreAPP** (`creapp---fintech-innovation-hub`, Vite+React19+Supabase+Vercel) y el **motor** (`Creador de Contenidos`, Python/FastAPI+Remotion).

## 1. Intención y porqué

Hoy el motor produce las piezas, el push (`python main.py push`) las sube a R2+Supabase, el equipo ve un tracker de aprobaciones **en vivo** (Plan 4) y existe "Enviar al cliente" por pieza (`sendPiece` → `client_visible=true`). **Pero el loop no cierra:** no hay forma de que el cliente entre a su portal (no existe alta/invite de usuario `client`), no hay avisos (ni al equipo cuando el cliente actúa, ni al cliente cuando el equipo presenta), y la propuesta está incompleta (faltan Historias, que el portal ya contempla como tipo pero nadie produce ni empuja).

Esto es exactamente lo que bloquea presentarle una campaña a un cliente real. El objetivo es cerrar ese loop de punta a punta, con el criterio del usuario: **la agencia decide cuándo presentar** (acceso permanente, no un link nuevo por mes), y **sin spamear al cliente**.

Flujo objetivo (en palabras del usuario): "Hola Pedro, te doy de alta en el portal para seguir tu campaña" → el cliente recibe un email con su acceso → entra y ve la propuesta completa (reels, carruseles, historias) → aprueba o pide cambios → el equipo se entera al toque → cuando la confianza está, el equipo decide cuándo volver a presentar algo, sin mandar el portal mes a mes.

## 2. Objetivos

1. **Alta + acceso del cliente.** Desde el admin, "Dar de alta al portal" sobre una marca: crea el usuario con rol `client`, lo liga a su marca (`client_members`, rol `owner`) y le manda un **email branded (Resend)** con un **link de acceso sin contraseña** (magic/invite). Reenviable. El admin ve el estado de acceso de cada cliente.
2. **Avisos al equipo.** Cuando el cliente **aprueba** o **pide cambios** en una pieza, el equipo recibe una notificación (centro in-app + FCM), de forma confiable (no depende de que el browser del cliente llame a un endpoint).
3. **Avisos al cliente (agrupados).** Cuando el equipo presenta o modifica la campaña, el cliente recibe **UN** email "novedades en tu campaña de [mes]", agrupando la tanda. Nunca un mail por pieza.
4. **Historias punta a punta.** El push tipa correctamente las historias como `story` y el portal las muestra en el riel "Historias"; **y se producen las historias de la campaña de Álvarez ahora** para dejar esa propuesta completa.

## 3. No-objetivos

- Multi-contacto por cliente (varios usuarios por marca): MVP un `owner`; el esquema ya lo permite, se amplía después.
- White-label del email por agencia: por ahora remitente CreAPP (`equipo@creapp.com.ar`).
- Botón de push / automatización del push desde la UI: el push sigue por CLI (`python main.py push`).
- Avisos por WhatsApp: solo email (cliente) y FCM + centro in-app (equipo).
- Rediseño del portal o del tracker: se reutilizan tal cual.

## 4. Anti-objetivos (fracaso aunque "funcione")

- Mandarle al cliente un mail por cada pieza presentada o cambiada (spam → queda mal con **su** cliente).
- Exponer `service_role` en el front o crear usuarios fantasma (como el bug viejo de `signUp` que resolvió `manage-team`).
- Historias que se empujen como `reel` o que rompan/dejen vacío el riel "Historias".
- Un aviso al cliente que se dispare en un momento que el equipo no controla (rompe la autonomía "nosotros decidimos cuándo presentar").
- Dar de alta un usuario `client` sin `raw_user_meta_data.role='client'` (el trigger lo dejaría como `vendedor` = equipo → fuga de acceso).

## 5. Restricciones

- **CreAPP front:** solo `anon` + RLS; `service_role` únicamente en edge functions. Copy es-AR (voseo). No romper tabs ni el routing por `?tab=`. `git add` solo los archivos de cada task (hay WIP del usuario en el working tree).
- **Email:** Resend, patrón existente `api/send-welcome-email.js` (serverless Vercel) + `src/lib/emailService.ts` (con fallback directo `VITE_RESEND_API_KEY`). Remitente `RESEND_FROM_EMAIL` (`CreAPP <equipo@creapp.com.ar>`), base `https://creapp.com.ar`.
- **Notificaciones equipo:** `dispatchNotification` → `/api/send-fcm-notification` + tabla `app_notifications` + centro in-app. `targetRole: 'all'|'admin'|'sales'`.
- **Supabase:** `client_members(client_id,user_id,role owner/viewer, unique(client_id,user_id))`, `content_approvals(job_id,client_user_id,decision,comment,created_at)`, helper `is_member_of(uuid)`, rol `client` ya en el enum. Migraciones idempotentes; aplicación diferida al usuario en el SQL Editor (como los planes anteriores).
- **Motor:** aislamiento estricto por cliente (AGENTS §11). Las historias ya existen como sistema (`src/tools/story_renderer.py`, `story_graphic_archetypes.py`, `src/remotion/components/cardoso_stories/`, `story_manifest.json`, `render-cardoso-story-videos.mjs`) pero son **bespoke por cliente** (hoy solo cardoso). El push vive en `src/integrations/portal_push.py` + `cloud_storage.upload_job_assets`.

## 6. Cómo se hace (decisiones tomadas)

### Parte 1 — Alta + acceso del cliente (DECISIÓN DEL USUARIO: contraseña en el primer ingreso)
El acceso NO es magic link recurrente: el cliente **define una contraseña en el primer ingreso** y después entra con **email + contraseña** (login clásico, sesión estable entre dispositivos). Esto suma una página de login y una de activación al portal.
- **Edge function nueva `invite-client`** (service_role), separada de `manage-team` (equipo). Input `{ clientId, email, fullName }`. Lógica:
  1. Si el email no existe: `admin.auth.admin.generateLink({ type: 'invite', email, options: { data: { full_name, role: 'client' }, redirectTo: '<base>/portal/activar' } })` — crea el usuario con `role='client'` en metadata y devuelve el `action_link` **sin** mandar el email de Supabase (lo mandamos branded).
  2. **Rechazo de colisión (anti-fuga, builder-check #7):** si el email **ya existe como usuario `admin`/`vendedor`**, la función **rechaza** con error claro ("ese email ya pertenece al equipo") y NO crea membership ni link. Solo da de alta clientes nuevos o emails ya `client`.
  3. Idempotente: `insert` en `client_members(client_id, user_id, role='owner')` con `on conflict do nothing`.
  4. Devuelve `{ activationLink, userId, isNew }`.
- **Página de activación `/portal/activar`:** recibe el token del invite (sesión temporal), el cliente **setea su contraseña** (`supabase.auth.updateUser({ password })`) y queda logueado → redirige a `/portal`.
- **Página de login del cliente `/portal/login`** (hoy NO existe; solo `/admin/login`): email + contraseña. `PortalGuard` manda ahí a los no autenticados. "Olvidé mi contraseña" → `generateLink({ type: 'recovery' })` branded.
- **Email branded:** nuevo `api/send-portal-invite.js` (clon de `send-welcome-email.js`) + función en `emailService.ts`. Asunto "Tu portal de campañas · [Marca]", copy es-AR, CTA "Activar mi acceso" → `activationLink`.
- **UI admin:** en `ContentCampaignsTab`, por cliente, acción **"Dar de alta al portal"** / **"Reenviar acceso"** + chip de estado: *Sin alta* (sin `client_members`) / *Invitado* (membership, sin contraseña/login) / *Activo* (ya ingresó). Estado desde `client_members` (+ `last_sign_in` vía service_role si hace falta).
- Reenviar acceso = `invite-client` otra vez (recovery/invite) + reenvía el email.

### Parte 2 — Avisos al equipo (cliente aprueba / pide cambios)
- **DB trigger** `AFTER INSERT ON content_approvals` → función que vía `pg_net` llama a una **edge function `notify-team`** (service_role). La edge function:
  - Resuelve cliente + pieza + decisión + comentario.
  - Inserta en `app_notifications` para admin/vendedor (reusa el esquema existente) y dispara FCM (reusa la lógica de `/api/send-fcm-notification` o la replica server-side).
  - Tipos nuevos: `content_approved`, `content_changes_requested`. Body es-AR: "[Marca] aprobó «[pieza]»" / "[Marca] pidió cambios en «[pieza]»" + comentario si hay.
- Confiable e independiente del browser del cliente. (Alternativa más simple si pg_net no está disponible: disparar `dispatchNotification` desde el `submitDecision` del portal como complemento, pero el trigger es la fuente de verdad.)
- **Canal confiable = centro in-app + realtime (builder-check #4/#5).** El `app_notifications` lo inserta la edge function; el **centro in-app del equipo debe suscribirse a `app_notifications` por Supabase Realtime** (agregar la tabla a la publicación `supabase_realtime` y suscribir el componente) para que el aviso aparezca sin refrescar — hoy el dispatcher solo avisa a listeners en memoria del propio browser. El **FCM web push** de `/api/send-fcm-notification` usa el endpoint **legacy** (apagado por Google en 2024) y cae a `mode:'simulated'` sin `FIREBASE_SERVER_KEY`: queda como **best-effort**; NO está en alcance migrarlo a HTTP v1. "Confiable" se cumple con centro in-app + realtime.

### Parte 3 — Avisos al cliente (agrupados, sin spam) + multi-campaña en el portal
- **Acción explícita del equipo "Enviar novedades al cliente"** (por campaña), en el tracker. Junta las piezas que pasaron a visibles o cambiaron **desde el último aviso** y manda **UN** email "Novedades en tu campaña de [mes]" con el **deep-link a esa campaña** y un resumen (N nuevas / M actualizadas). Respeta "nosotros decidimos cuándo presentar". (Confirmado: explícito, no automático.)
- **Registro** `content_client_notifications(campaign_id, sent_at, piece_count)` para saber desde cuándo agrupar y mostrar "última vez que avisaste: …".
- **Multi-campaña en el portal (DECISIÓN DEL USUARIO: selector + deep-link).** Hoy `getMyCampaign()` hace `LIMIT 1` (solo la más nueva; las anteriores desaparecen). Cambios: `portalService` trae **todas** las campañas del cliente; `PortalView` suma un **selector de campañas** (dropdown por mes) y soporta `?campaign=<id>` en la URL para que el email abra exactamente la campaña que menciona; los meses anteriores quedan visibles. Default: abre la más reciente si no hay id.

### Parte 4 — Historias punta a punta (DECISIÓN DEL USUARIO: una por reel ~5, linkeada)
- **Push tipado:** `cloud_storage.upload_job_assets` + `portal_push` detectan historia por presencia de `manifests/story_manifest.json` (o `'_story_'` en el job_id) → `type='story'`, suben el MP4 + su cover. Verificado: `content_jobs.type` es `text` **sin CHECK**, así que `'story'` entra sin migración. El portal ya agrupa `story` en el riel "Historias" (`ORDER`/`TYPE_META` en `portalView.ts`); validar que `coverUrl` y `mediaUrl` lleguen.
- **Producción Álvarez — pipeline bespoke completo** (el sistema de stories es 100% a medida de Cardoso; NO se reusa — AGENTS §11). Es un build Remotion propio, no un ajuste de push. Alcance confirmado: **una historia por reel (~5)**, cada una **linkeada a su reel** (`linked_to`, como en Cardoso). A crear, espejando el patrón Cardoso: `src/remotion/components/alvarez_stories/` (content/registry/runs), `render-alvarez-story-videos.mjs` (con su mapa `JOBS`), `alvarez-story-video-index.ts`, `scripts/alvarez_stories_post.py`. Contenido dental real de Álvarez (runs/guion) — lo define quien construye, siguiendo §0.45/§0.46 y el casting/compliance de Álvarez. Render + cover + `publish_copy` (el push lo genera si falta) + push como `story`.

## 7. Qué queda para quien construye (plan)

- **Orden recomendado:** Parte 1 (desbloquea presentar) → Parte 2 → Parte 3 → Parte 4. Partes 1–3 son CreAPP+Supabase; Parte 4 es motor (+ un toque de push).
- Migraciones nuevas (idempotentes, aplicación diferida): `content_client_notifications`; trigger + función para `notify-team`; (realtime ya habilitado en Plan 4). Verificar `role='client'` en el metadata del invite.
- Detalle de los templates de email (invite y novedades) branded es-AR.
- Mecanismo exacto FCM server-side desde la edge function (token/credenciales ya usados por `/api/send-fcm-notification`).
- Definir el **contenido real de las historias de Álvarez** (runs/guion), dentro del sistema de stories existente.
- Tests: mapper del estado de acceso; edge functions (invite, notify) con mocks; push tipa `story` (pytest en el motor); el gate del motor `scripts/test_frontend_integrity.js` NO aplica a CreAPP.

## 8. Decisiones del usuario (cerradas 2026-11-09)

1. **Acceso del cliente:** contraseña en el primer ingreso (no magic link recurrente). Suma `/portal/activar` y `/portal/login`. — Parte 1.
2. **Multi-campaña en el portal:** selector de campañas + deep-link por `?campaign=<id>`; los meses anteriores quedan visibles. — Parte 3.
3. **Historias Álvarez:** pipeline bespoke completo, una por reel (~5), linkeada a su pieza. — Parte 4.
4. **Aviso al cliente:** explícito (acción "Enviar novedades"), agrupado por tanda — no automático, no spam. — Parte 3.

## 9. Resoluciones del builder-check (mis decisiones, para que las revises)

- **Tipo `story`:** `content_jobs.type` es `text` sin CHECK → entra sin migración (verificado).
- **FCM:** endpoint legacy apagado; no se migra ahora. Canal confiable al equipo = centro in-app + Supabase Realtime (hay que suscribir el centro a `app_notifications` y sumar la tabla a la publicación). FCM push = best-effort.
- **Invite + email del equipo:** `invite-client` **rechaza** un email que ya sea `admin`/`vendedor` (evita que un cliente herede acceso de equipo).
- **"Activo" del chip de estado:** usa `last_sign_in` vía service_role; si resulta caro, el chip se queda en *Invitado/Activo* por presencia de sesión — decisión menor del builder.
