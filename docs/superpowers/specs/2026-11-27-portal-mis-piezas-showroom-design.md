# Portal · "Mis Piezas" (showroom de piezas publicadas)

**Fecha:** 2026-11-27
**Repo:** `creapp---fintech-innovation-hub` (Creapp-apps/Creapp-WebPage)
**Estado:** diseño aprobado en conversación (UX A + proxy en Vercel + scope por switcher + desaparición al purgar). Pendiente visto bueno del doc.
**Proyecto relacionado (aparte, va después):** administrador de almacenamiento R2 en la Suite ("Almacenamiento"): ver uso de R2, piezas con su peso por cliente/campaña, y borrar piezas directo contra Cloudflare (borra el objeto en R2 + limpia el puntero en la base). Se brainstormea y diseña como proyecto propio. "Mis Piezas" NO depende de él (ver "Purga de R2" abajo).

## Intención y por qué

El cliente del portal hoy ve su campaña, el calendario y los insights, pero no tiene un lugar
donde **acceder a las piezas ya publicadas para difundirlas por su cuenta**. El pedido: una
sección nueva **"Mis Piezas"** — un showroom que se va llenando a medida que cada pieza se
publica, desde donde el cliente pueda, por pieza:

1. **Compartir** la pieza como con el botón de "compartir" del celular (hoja nativa del sistema).
2. **Descargar el `.mp4`** para subirlo él mismo a cualquier canal.

El valor: el cliente deja de depender de la agencia para reusar su propio material. Lo comparte
a WhatsApp, lo sube a otra red, lo manda por mail — solo.

## Objetivos

- Sección "Mis Piezas" en el sidebar del portal del cliente.
- Muestra **solo piezas publicadas** (`CalendarPiece.published === true`) **de la campaña seleccionada en el switcher** (mismo scope que el calendario), nunca las programadas a futuro.
- Se actualiza en vivo: cuando una pieza pasa a publicada, aparece sin recargar (mismo realtime del calendario).
- Muestra **solo piezas cuyo archivo sigue vivo en R2**: si se purgó, la pieza **desaparece** del showroom automáticamente (ver "Purga de R2").
- Por pieza: **Compartir** (hoja nativa en celular, con el archivo `.mp4`) y **Descargar `.mp4`**.
- Reproductor embebido para ver la pieza antes de compartir/descargar.
- Estética 100% chrome CreAPP, acentos por tema del cliente (igual que calendario/insights). Regla chrome-only: no se tocan motion-graphics.

## No-objetivos

- No edita, re-renderiza ni re-publica piezas. Solo lectura + compartir/descargar.
- No muestra métricas (eso es Insights).
- No toca el flujo de revisión/aprobación.
- No expone piezas en proceso ni programadas a futuro.

## Anti-objetivos (que harían fracasar la feature aunque "funcione")

- Que una pieza de **otro** cliente sea descargable (fuga de material). El proxy debe gatear por membresía.
- Que el botón "Descargar" abra el video en una pestaña y lo reproduzca en vez de bajar el archivo.
- Que en compu el botón "Compartir" quede muerto porque no existe la hoja nativa del SO.

## Restricciones

- Portal = Vite + funciones serverless en Vercel. Auth del cliente = Supabase (Bearer de la sesión).
- El `.mp4`/imágenes finales viven en **URL pública de R2** (`scheduled_posts.media_r2_urls`); el `<video>` del portal ya los reproduce directo.
- Patrón de endpoint autorizado ya existe: `requireMember` + `serviceClient` + `applyPortalCors`.
- `api/download-video.js` hoy es un stub que devuelve 501 — es el lugar natural del proxy.
- RLS ya scopea `scheduled_posts` al cliente en lectura desde el browser (lo usa el calendario).

## Enfoques considerados

### UX del botón "Compartir" — **elegido: A**
- **A (elegido):** en celular, hoja nativa (`navigator.share`) compartiendo el **archivo `.mp4`**;
  donde no se pueda compartir archivo, cae a compartir el **link del post** (`permalink`) + caption;
  en compu, menú propio (copiar link, WhatsApp, descargar).
- **B (descartado):** compartir siempre el link de Instagram, nunca el archivo. No cumple "difundirlo por el canal que sea" (el cliente quiere el archivo).

### Alcance de las piezas — **elegido: scope por switcher**
- **Switcher (elegido):** muestra lo publicado de la campaña seleccionada arriba (`campaignId = live ? null : campaign.id`, igual que el calendario). Consecuencia intencional: con una campaña nueva (no `live`) seleccionada, la sección se ve vacía hasta que esa campaña tenga piezas publicadas.
- **Acumulativo (descartado):** histórico completo del cliente ignorando el switcher.

### Mecanismo de descarga/compartir-archivo — **elegido: Proxy en Vercel**
- **Proxy (elegido):** reactivar `api/download-video`. `requireMember` → valida que la pieza publicada
  es del cliente → trae el media de R2 del lado del server → lo devuelve con
  `Content-Disposition: attachment` y nombre `marca-tipo-fecha.mp4`. El cliente hace `fetch → blob` y
  con ese blob resuelve **descarga** (con nombre) y **compartir archivo** (`navigator.share({ files })`).
  - A favor: funciona sin depender de CORS de R2; nombre de archivo controlado; acceso gateado al miembro; reusa el stub.
  - En contra: los bytes pasan por Vercel (despreciable para reels de pocos MB).
- **Cliente directo desde R2 (descartado):** `fetch` a la URL pública de R2 en el browser. Sin servidor, pero
  depende de que R2 mande CORS al origen del portal (no verificable ahora; que el `<video>` reproduzca no lo garantiza). Si no, se rompe.

## El "cómo" decidido

### Datos (reuso, sin nuevas tablas)
- Reusar `getMyCalendarPieces(campaignId)` + `subscribeMyCalendar` y filtrar `.published === true` **y** `mediaUrls.length > 0`.
- Scope de campaña igual que el calendario: `campaignId = live ? null : campaign.id`.
- Filtrar además por **disponibilidad en R2** (liveness check server-side; ver "Purga de R2"): no se muestran piezas con media purgado.
- Orden: más recientes primero (por `date` desc).

### UI — nueva sección `piezas`
- `PortalSection` suma `'piezas'`; `PortalShell.NAV` suma el ítem (icono lucide, p.ej. `Clapperboard`/`Share2`), siempre visible.
- Nuevo componente `MisPiezas.tsx`: grilla de tarjetas (cover 9:16 + tipo + fecha). Vacío: estado "Todavía no publicamos piezas; acá vas a verlas apenas salgan."
- Al tocar una tarjeta: vista de detalle con `PortalVideo` (reel/story) o visor de slides (carrusel) + barra de acciones **Compartir** / **Descargar**.
- Wiring en `PortalView`: `{section === 'piezas' && <MisPiezas campaignId={live ? null : campaign.id} />}`.

### Compartir (util nuevo `sharePiece.ts`, testeable)
Escalera de capacidades:
1. `navigator.canShare?.({ files: [mp4File] })` → `navigator.share({ files, title, text })` (celular con archivo).
2. Si no, `navigator.share?.({ url: permalink, text: caption })` (compartir link; muchos navegadores móviles y Safari desktop).
3. Si no, menú propio: copiar link (`permalink` o link del portal), WhatsApp (`wa.me/?text=`), descargar.
El archivo `.mp4` para (1) se obtiene del mismo `fetch → blob` del proxy.
- **iOS Safari (activación de usuario):** `navigator.share({ files })` exige que el share salga inmediato al toque; un `await fetch` de varios MB en medio puede invalidar la activación y tirar `NotAllowedError`. Mitigación decidida: al abrir el detalle de una pieza se **precarga el blob** (spinner chico); el tap de "Compartir" usa el blob ya cargado y la hoja nativa sale al instante.

### Descargar
- `fetch('/api/download-video?post=<scheduled_posts.id>&i=<index>', { headers: { Authorization: Bearer } })` → `blob` → `URL.createObjectURL` → `<a download="marca-tipo-fecha.mp4">` → revoke.

### Purga de R2 y disponibilidad (desaparición automática)
- El usuario purga R2 **a mano** desde Cloudflare cuando se acerca al límite (hoy), o desde el futuro administrador de almacenamiento de la Suite (proyecto aparte). "Mis Piezas" **no depende de cómo se purga**.
- Garantía: una pieza cuyo archivo ya no está en R2 **desaparece del showroom**, sin requerir que la purga toque la base.
- Mecanismo: **chequeo de vida del lado del servidor**. El showroom pide la disponibilidad de los media de las piezas publicadas a un endpoint que hace `HEAD` a cada URL de R2 server-side (evita CORS); solo se muestran las piezas con media vivo.
  - Endpoint liveness: `GET /api/portal/pieces-availability?post=<id,id,...>` (o fold en un endpoint de datos del showroom) → `{ [postId]: boolean }`. `requireMember` + `applyPortalCors`; valida que los posts sean del miembro antes de chequear.
  - Caché corta server-side (p.ej. ~5–10 min) para no `HEAD`-ear en cada apertura; aceptable para pocas piezas por campaña.
- Red de seguridad: aunque una pieza alcance a mostrarse, el proxy de descarga devuelve 404 si el objeto ya no está, y el cliente degrada la acción a "ya no disponible" en vez de una descarga rota.
- Limpiar el puntero `media_r2_urls` en la base al purgar es **deseable pero no requerido** para v1 (lo hará el administrador de almacenamiento cuando exista); el liveness check cubre la purga manual igual.

### Proxy `api/download-video.js` (reescrito)
- `GET ?post=<scheduled_posts.id>&i=<index=0>`.
- `applyPortalCors` (preflight OPTIONS). `requireMember(req)` → clients (slugs).
- `serviceClient` lee la fila `scheduled_posts` por `id`; valida: `status` publicado **y** `client_id` (slug) ∈ slugs del miembro. Si no, 403.
- Toma `media_r2_urls[i]`; si no existe (fila sin media) → 404.
- `fetch` del media en el server; si R2 responde 404/410 (purgado) → **404 "no disponible"** (no error). Si OK, responde con el `Content-Type` upstream + `Content-Disposition: attachment; filename="<sanitizado>.<ext>"`, stream del body.
- Sin credenciales R2 nuevas (la URL es pública; el server solo la proxea / `HEAD`-ea). Sin env nuevas.

## Qué queda a criterio del builder

- Icono y rótulo exactos del ítem de nav (p.ej. "Mis Piezas" + `Clapperboard`).
- Nombre de archivo: derivado server-side (marca/tipo/fecha) vs sugerido por el cliente y sanitizado. Preferencia: derivar en el server.
- Carrusel: v1 comparte **link** + permite **descargar cada imagen**; compartir multi-archivo queda fuera de v1.
- Layout fino de la grilla y la vista de detalle (reusar tokens/estilos de calendario e `PortalHome`).
- Afinado del liveness: TTL de caché, `HEAD` individual vs batcheado, y si se fold en un endpoint de datos o va suelto.
- Reusos ya definidos (no re-decidir): visor de carrusel = patrón `PiecePlayer` (img + prev/next); `fetch` autenticado desde el browser = patrón `insightsService` (`getSession().access_token` → Bearer); índice de media = `mediaUrls[0]` mp4 para reel/story, `mediaUrls` imágenes para carrusel.
- Tests: filtro de publicadas + con-archivo, escalera de `sharePiece`, auth/veto del proxy (miembro ajeno → 403), y 404 del proxy ante media purgado (degradación a "no disponible").
