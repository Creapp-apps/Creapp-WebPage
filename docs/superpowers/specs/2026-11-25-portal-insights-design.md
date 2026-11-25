# Portal del cliente — Insights / Estadísticas (P2)

Fecha: 2026-11-25
Estado: diseño, pendiente de aprobación
Repo: `creapp---fintech-innovation-hub` (Vite + React SPA + Vercel API routes)
Depende de: P1 (shell + sidebar) ya mergeado — esto desbloquea el ítem 🔒 Insights.

## 1. Intención y por qué

El cliente ya ve su campaña (P1). Ahora queremos que entre a **Insights** y vea las
métricas reales de SU cuenta de Instagram: "accedé a las stats de tu
servicio/campaña". Es valor percibido + transparencia + retención del cliente.

El cliente ve **dos cosas** (decisión del usuario): su **cuenta** (vanity en el
tiempo) y sus **piezas** (rendimiento pieza por pieza).

## 2. Hallazgos de recon (fundan la arquitectura)

- El token de Meta es **SYSTEM_USER, no expira**, app "DentaliAPP - Content
  Creator", y **ya tiene `instagram_manage_insights`** (verificado en vivo:
  `check_token_validity` lo lista en scopes y granular_scopes; un probe a
  `get_instagram_account_insights` respondió con la **lista de métricas válidas**,
  no con error de permiso). → **El permiso ya está activo. No hay App Review
  pendiente para insights.**
- Métricas de cuenta válidas (de la respuesta en vivo, Graph v21): `reach,
  follower_count, profile_views, accounts_engaged, total_interactions, likes,
  comments, shares, saves, views, profile_links_taps, online_followers,
  follower_demographics, reached_audience_demographics`.
- **Insights por pieza también verificado en vivo** (`get_instagram_post_insights`
  sobre un reel real): devuelve `reach, likes, comments, shares, saved,
  total_interactions` con datos. → El bloque "Tus piezas" es **viable**.
- **Multi-cliente ya resuelto por la publicación**: token por cliente =
  env var `META_ACCESS_TOKEN__<slug>` (`resolveClientToken` en
  `src/lib/publishQueuePhases.ts`, llaveado por **SLUG** del motor, no uuid),
  e `ig_account_id` vive en `scheduled_posts.ig_account_id` (filas con
  `client_id` = **SLUG**). Mismo app/scope → sirve para insights.
- **Identificadores (gotcha clave, igual que P1):** `client_members.client_id` =
  **UUID** (`clients.id`); el token y `scheduled_posts` = **SLUG**. El endpoint
  debe trabajar en **SLUG** y traducir desde el uuid de membresía.
- Graph base `v21.0` (`GRAPH_API_BASE` en `metaCronService.ts`).
- Patrón de API route + auth: `api/_lib/requireAdmin.ts` valida el Bearer con
  `supabase.auth.getUser` (service role) y chequea rol; `api/_lib/serviceClient.ts`
  da el client service-role; `api/_lib/portalCors.ts` el CORS del portal.
- No hay lib de gráficos en el repo → **sparklines SVG inline** (sin dependencia).

## 3. Goals / Non-goals / Anti-goals

**Goals**
- Sección **Insights** en el portal (desbloquea el ítem 🔒), con dos bloques:
  **Tu cuenta** (serie temporal: seguidores, alcance, visitas al perfil,
  interacciones; demographics si hay datos) y **Tus piezas** (cada pieza
  publicada con alcance, likes, comentarios, guardados, compartidos; ordenable).
- Endpoint server `GET /api/portal/insights` que resuelve token + `ig_account_id`
  del cliente, pega a Graph, y **cachea el resultado por cliente ~45 min**
  (Supabase `ig_insights_cache`). El token nunca toca el browser.
- "Actualizado hace X" honesto (timestamp del caché) + botón "Actualizar" con
  piso anti-abuso.
- Degradación prolija: una métrica o una pieza que falla **no** rompe la página.

**Non-goals**
- No se construye B (snapshot por cron) ni warehouse histórico de largo plazo
  (el caché es corto, no un historial).
- No se gestiona el alta de tokens por cliente (son env vars, tema de ops).
- No se tocan P1 ni la publicación.

**Anti-goals (fracaso aunque "funcione")**
- Token de Meta **expuesto al browser**.
- Un cliente viendo insights de **otro** cliente (falla de membership).
- Vender "tiempo real" ocultando que está cacheado/stale.
- Un solo metric/pieza que falla y **deja la página en blanco** (500).

## 4. Constraints

- Vite SPA (browser) → el token NO puede estar en el cliente: todo Graph es
  server-side (Vercel API route). El portal solo habla con `/api/portal/insights`.
- Auth del request = **cliente del portal (member)**, no admin. Nuevo helper
  `requireMember` (espejo de `requireAdmin`, pero resuelve `client_id` vía
  `client_members`).
- Rate limits de Graph → caché obligatorio; per-piece es N llamadas, el caché las
  amortigua.
- Límite de Meta: `follower_demographics`/algunas métricas requieren **≥100
  seguidores**; clientes chicos las verán vacías → degradar, no romper.
- Sparklines SVG inline (sin lib). Cargar la skill `dataviz` antes de dibujar
  cualquier gráfico.
- Disciplina RLS vigente (fail-closed). El caché es **server-only** (service role
  escribe y lee); el portal no lo lee directo, así que no necesita RLS de member.

## 5. Approaches considerados

- **A — Live + caché server corto (ELEGIDA).** El endpoint pega a Graph on-demand
  pero cachea por cliente ~45 min en `ig_insights_cache`. Fresco, rápido en
  recargas, Graph acotado, "actualizado hace X" honesto del timestamp. Reusa el
  patrón `/api/*` + service role. Portal-only.
- **B — Snapshot por cron.** Un cron baja insights de todos a una tabla; el portal
  lee por RLS. Página instantánea y mínima presión a Graph, pero más stale y más
  infra (cron + tabla + RLS + backfill). Para cuando haya mucho tráfico.
- **C — Live puro.** Sin caché; lento y arriesga rate limit (sobre todo per-piece).

**Elegida: A**, confirmada por el usuario.

## 6. El "cómo" decidido

### 6.1 Backend — tabla de caché (migration)

`supabase/migrations/2026112X_ig_insights_cache.sql`:
```sql
create table if not exists public.ig_insights_cache (
  client_id text primary key,  -- SLUG (misma llave que token y scheduled_posts)
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.ig_insights_cache enable row level security;
-- Sin policies de member: solo service role (los endpoints) lee/escribe.
```

### 6.2 Backend — auth helper `api/_lib/requireMember.ts`

- `requireMember(req): Promise<{ user, clients: { id: string; slug: string }[] }>`
- Espejo de `requireAdmin`: parsea Bearer, `supabase.auth.getUser` (service role),
  luego `client_members.select('client_id').eq('user_id', user.id)` (uuids) y
  **join a `clients`** para traer el `slug` de cada uno. Sin filas → 403. Devuelve
  la lista `{ id (uuid), slug }` — el **slug** es la llave que usa insights.

### 6.3 Backend — endpoint `api/portal/insights.ts`

`GET /api/portal/insights` (opcional `?client=<slug>`, `?refresh=1`):
1. `applyPortalCors`; solo GET.
2. `{ user, clients } = await requireMember(req)` → lista `{ id, slug }`.
3. **Resolución de cliente (mono-cliente, como el resto del portal):** si no se
   pasa `?client=`, usar el **único** `clients[0].slug` (el portal es mono-cliente:
   `portalService` lee con `limit(1)`). Si se pasa `?client=<slug>`, **validar que
   ∈ los slugs del miembro** (si no, 403). Si el miembro tiene >1 cliente y no pasa
   `client`, usar `clients[0]` (limitación conocida; no hay selector hoy). De acá
   en adelante la llave es **`slug`**.
4. Leer `ig_insights_cache` por `slug`. Si `fetched_at` < TTL (45 min) y no es
   force → devolver `payload` + `fetched_at` (cache hit).
5. Cache miss / `?refresh=1` (con piso: solo si el caché tiene >5 min): recomputar:
   - Resolver `ig_account_id` del cliente (de cualquier `scheduled_posts` con
     `client_id = slug`; sin filas → payload vacío honesto).
   - `token = META_ACCESS_TOKEN__<slug>` (`resolveClientToken`). Falta → 200
     con `payload` vacío + flag `needs_connection: true` (no 500).
   - **Cuenta**: `GET {GRAPH}/{ig_account_id}/insights?metric=...&...` con los
     params que el implementador **fija probando el endpoint en vivo** (period /
     metric_type varían por versión; la lista de métricas válidas ya salió del
     probe de recon). Cada métrica que falle se omite (try/catch por métrica).
   - **Piezas**: leer `scheduled_posts` publicadas del cliente (status=published,
     con `published_media_id`, `ig_account_id`, `permalink`, `caption`,
     `cover_r2_url`, `platform`). Para cada una, `GET {GRAPH}/{media_id}/insights?
     metric=...`. Set confirmado en vivo para reel: `reach, likes, comments,
     shares, saved, total_interactions`; imagen/carrusel usan el mismo núcleo
     (ajustar si Graph rechaza alguno). Fallo por pieza → esa pieza queda con
     métricas parciales/nulas, no rompe.
   - `upsert` en `ig_insights_cache`, devolver.
6. Shape de respuesta estable (ver 6.4). Timeout por fetch (AbortController, como
   cron-logs). Errores → mensaje suave, nunca token ni detalle interno.

### 6.4 Shape de datos — `insightsMapper.ts` (lógica pura, testeada)

- `InsightsPayload = { account: AccountMetric[]; pieces: PieceInsight[]; followerCount: number | null; demographics: Demo | null; needsConnection: boolean }`
- `AccountMetric = { key: string; label: string; total: number; series: { t: string; v: number }[] }`
- `PieceInsight = { mediaId: string; type: 'reel'|'carousel'|'story'; coverUrl: string | null; permalink: string | null; caption: string | null; reach: number | null; likes: number | null; comments: number | null; shares: number | null; saved: number | null }`
- `mapAccountInsights(graphJson)`, `mapPieceInsights(rows, graphById)`, `topPieces(pieces, by)`, `freshnessLabel(fetchedAtISO, now)`. Éstas son las unidades testeables (node:test en `src/lib/`).

### 6.5 Frontend — `insightsService.ts`

- `getMyInsights(clientId, opts?: { refresh?: boolean }): Promise<InsightsView>` —
  `fetch('/api/portal/insights?...', { Authorization: Bearer <supabase session token> })`,
  igual que `launchesService.call`. Mapea con `insightsMapper`.

### 6.6 Frontend — sección `PortalInsights.tsx` + desbloqueo del sidebar

- `PortalSection` pasa a incluir `'insights'`; el ítem del sidebar deja de estar
  `disabled`/`locked`. (`PortalShell.tsx`, `PortalView.tsx`.)
- Bloque **Tu cuenta**: tarjetas de stat (seguidores, alcance, visitas, interacciones)
  con **sparkline SVG inline** de su serie; demographics si `demographics != null`.
- Bloque **Tus piezas**: lista/grid de piezas publicadas (portada + métricas),
  ordenable por alcance/guardados; link al permalink. Estilo contenido-del-cliente
  (acentos `--wood`, **chrome-only**: nada de violeta CreAPP en el contenido).
- Header: "Actualizado hace X" (`freshnessLabel`) + botón "Actualizar".
- Estados: sin `ig_account_id`/token → "Todavía no conectamos tus estadísticas"
  (honesto); <100 seguidores → demographics ocultas con nota; carga/errores suaves.
- **Cargar la skill `dataviz` antes de dibujar los sparklines y las stat tiles.**

## 7. Qué queda a criterio del builder

- Matriz exacta de params de Graph por métrica (period/metric_type/timeframe),
  **fijada probando el endpoint en vivo** (la versión manda sobre la memoria).
- Set de métricas por tipo de media en per-piece (reel vs imagen/carrusel/story).
- TTL del caché (default 45 min) y piso del force-refresh (5 min).
- Markup/CSS de stat tiles, sparklines y la lista de piezas (tokens `portal.css`,
  prefijo `.ins-`), guiado por la skill `dataviz`.
- Tests: `insightsMapper` (account shape, per-piece shape, top/orden, freshness,
  degradación con métricas/piezas faltantes); `requireMember` lo cubre el patrón
  de auth. El endpoint y la UI se verifican por build + humo con un cliente real.

## 8. Riesgos

- **Params de Graph por versión**: si una métrica cambió de forma, se omite (degrada)
  y se pinta lo que sí vuelve; el probe en vivo fija el resto.
- **Token de cliente sin scope insights**: improbable (mismo app), pero si un
  token no lo tiene → esas llamadas fallan y se degrada a vacío con nota.
- **Rate limit** en per-piece con muchas piezas: el caché 45 min lo acota; si
  hiciera falta, limitar a las últimas N piezas publicadas.

## 9. Resoluciones del builder-check (decisiones mías, para que las revises)

1. **slug vs uuid (crítico)**: todo el layer de insights trabaja en **SLUG**
   (token, `scheduled_posts`, PK del caché). `requireMember` devuelve el slug de
   cada cliente (join `client_members`→`clients`), y la validación de `?client=`
   usa la **misma** llave que la query → cierra el anti-goal de fuga. (§6.2, §6.3)
2. **Per-piece viable**: verificado en vivo (reach/likes/comments/shares/saved/
   total_interactions). "Tus piezas" queda como bloque central, no condicional. (§2)
3. **Mono-cliente**: el portal asume un cliente por usuario (`limit(1)`). El
   frontend **no manda `?client=`**; el server resuelve el único slug del miembro.
   Miembro con >1 cliente = limitación conocida (sin selector hoy). (§6.3)
