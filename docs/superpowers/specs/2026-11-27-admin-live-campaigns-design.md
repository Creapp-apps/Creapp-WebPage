# Admin · campañas en vivo (modo publicado directo)

**Fecha:** 2026-11-27 · **Repo:** creapp---fintech-innovation-hub · **Rama:** admin-live-campaigns

## Bug / intención
En el panel admin (Campañas de Contenido), un cliente que publicó **directo** (tiene `scheduled_posts` pero **no** `content_campaigns` ni `content_jobs`) aparece como "Este cliente todavía no tiene campañas", aunque el **portal del cliente** sí muestra su campaña vía su **modo en vivo** (`getMyCampaigns` → `buildLiveCampaign`). Confirmado con datos: Stacked = 0 `content_campaigns`, 0 `content_jobs`, 20 `scheduled_posts`.

**Causa raíz:** `contentTrackerMapper.mapTracker` arma `client.campaigns` **solo** desde `content_campaigns`; no tiene el fallback de modo en vivo que sí tiene el portal. Asimetría portal↔admin.

## Objetivo
Darle al admin el mismo modo en vivo que el portal: un cliente con `scheduled_posts` y sin `content_campaigns` muestra un **grupo de campaña en vivo** (no más "sin campañas"), con sus piezas (cover + estado de publicación), visualmente consistente con un grupo de campaña normal.

## No-objetivos / límite honesto
Las piezas en vivo **no** pasaron por review (no hay `content_jobs`/aprobaciones), así que el grupo en vivo **no** muestra los controles de review (chips `Enviada/Listo/Renderizada`, `Sin revisar`, barra `X/Y aprobadas`, `Despublicar`/`Abrir en Estudio`/`Conversación`, `Enviar novedades`, `Cerrar`). Muestra lo que corresponde a piezas ya publicadas: cover, título, y estado de publicación (`Publicada`/`Programada`/…). No se inventa data de review.

## Diseño
- **Tipos** (`contentTrackerTypes.ts`): `TrackerCampaign.live?: boolean` y `TrackerPiece.live?: boolean`.
- **Service** (`contentTrackerService.ts`): el `select` de `scheduled_posts` suma `cover_r2_url, scheduled_at, platform, caption` (hoy solo `client_id, job_id, status, error_message`).
- **Mapper** (`contentTrackerMapper.ts`): para cada cliente, si `camps.length === 0` **y** tiene `scheduled_posts` (join por **slug**: `scheduled_posts.client_id === client.slug`), sintetizar **una** campaña en vivo:
  - `id: 'live:<slug>'`, `slug`, `title: null`, `month: 'YYYY-MM'` (del `scheduled_at` más temprano), `status: 'active'`, `live: true`.
  - `pieces`: cada `scheduled_post` → `TrackerPiece` con `id` (sched id), `type` (`deriveType(platform)`), `title` (del `caption`, o null), `coverUrl` (`cover_r2_url`), `publishStatus` (status si es `PublishStatus`, si no `queued`), `publishErrorMessage` (`error_message`), `jobIdMotor` (`job_id`), `live: true`. Los campos de review quedan neutros (no se muestran).
  - **No** suma estas piezas a `client.counts` (son de review); se agregan a `camps` después del loop de counts.
  - Solo se sintetiza cuando el cliente **no** tiene `content_campaigns` (igual que el portal). Un cliente con campañas normales + scheduled_posts NO recibe grupo en vivo.
- **View** (`contentTrackerView.ts`): helper `monthLabel('YYYY-MM' | 'YYYY-MM-DD') → 'Noviembre 2026'` (Intl es-AR).
- **CampaignGroup.tsx** (variante `campaign.live`): título = `monthLabel(month)`; badge "En vivo"; en vez de "X/Y aprobadas" muestra "M publicadas de N"; oculta chips de review, "Enviar novedades" y "Cerrar/Reabrir" (no hay fila real para mutar); piezas vía `PieceStatusRow`.
- **PieceStatusRow.tsx** (variante `piece.live`): cover + título + chip de estado de publicación; oculta chip de review, Enviada/Borrador, stage, Render, y todos los botones + Conversación.

## Tests
`contentTrackerMapper.test.ts`: (a) cliente sin `content_campaigns` + con `scheduled_posts` → 1 campaña `live:true`, piezas con cover+publishStatus, `month` derivado, counts NO inflados; (b) cliente con `content_campaigns` + scheduled_posts → sin grupo en vivo; (c) join por slug (no uuid).
Verificación UI: `npm test`, `npm run build`, `npx tsc --noEmit`.
