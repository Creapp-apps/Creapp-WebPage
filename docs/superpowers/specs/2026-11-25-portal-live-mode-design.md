# Portal del cliente — Modo "campaña en vivo" (P4 / opción B)

Fecha: 2026-11-25
Estado: diseño, pendiente de aprobación
Repo: `creapp---fintech-innovation-hub`. Construye sobre P1/P2/P3 (todo en `main`).

## 1. Intención y por qué

**Causa raíz hallada (debug):** un cliente puede tener su campaña **publicada/
programada** (`scheduled_posts` en Supabase) **sin** haber pasado por el flujo de
revisión del portal (`python main.py push` nunca corrió sus jobs) → en el portal
`content_campaigns`/`content_jobs` = **0**. Evidencia (stacked, read-only):
`content_campaigns: 0`, `content_jobs: 0`, `scheduled_posts: 20`.

Hoy `getMyCampaigns` se apoya 100% en `content_campaigns`/`content_jobs`, así que
para un cliente "solo publicado" el portal corta en "Tu campaña se está preparando"
y **nunca monta** Home/Calendario/Insights — aunque los datos existen en
`scheduled_posts`.

**Objetivo (opción B, elegida por el usuario):** desacoplar el portal del flujo de
revisión. Que el shell + **Home + Calendario + Insights** se muestren para cualquier
cliente que tenga `scheduled_posts`, aunque no tenga `content_jobs`. Campaña ya
publicada = **modo en vivo** (read-only, sin review). El flujo de revisión
(`content_jobs` 'sent') sigue igual para campañas que sí pasan por el portal antes
de publicar.

## 2. Goals / Non-goals / Anti-goals
**Goals**
- Un cliente con `scheduled_posts` pero sin `content_campaigns` ve el portal
  completo en **modo en vivo**: Home (resumen de lo publicado/por venir),
  Calendario, Insights. Revisión: estado honesto "nada para revisar".
- RLS: el miembro puede leer **sus** `scheduled_posts` sin depender de
  `content_jobs` (scoping por cliente, slug→uuid, fail-closed).
- Cero cambio para el flujo de revisión existente (Materalia sigue igual).

**Non-goals**
- No se cambia `main.py push` ni el pipeline del motor.
- No se sincroniza el `aesthetic` del cliente al portal (sin campaña no hay
  archetype → tema por default + acento de marca).
- No se agregan endpoints nuevos (Insights ya es server-side y funciona por slug).

**Anti-goals (fracaso aunque funcione)**
- Un cliente viendo `scheduled_posts` de **otro** (fuga por el RLS reshape).
- Modo en vivo que aparezca para un cliente **sin** publicaciones (ese sigue en
  "preparándose").
- Revisión que crashee con 0 piezas.

## 3. Hallazgos (fundan el cómo)
- `client_public` (gated por `is_member_of(id)`) expone `id, slug, name, logo_url,
  brand_colors` → branding del cliente disponible **sin** campaña.
- `clients.slug` es **UNIQUE** → el mapeo slug→uuid en RLS es determinista y seguro.
- `aesthetic_archetype` solo vive en `content_campaigns` → en vivo no hay archetype;
  el tema cae al default (executive_wealth) tomando el acento de `brand_colors`.
- `calendarService.getMyCalendarPieces(null)` ya funciona sin `content_jobs`: con
  `campaignId=null` no filtra por campaña y la portada sale de `scheduled_posts.
  cover_r2_url` (el join a jobs queda vacío, no rompe).
- La policy RLS actual de `scheduled_posts` (P1) **requiere** `content_jobs` →
  bloquea la lectura en vivo. Hay que reemplazarla.

## 4. El "cómo"

### 4.1 RLS — leer `scheduled_posts` por membresía directa (reemplaza la de P1)
`supabase/migrations/2026112X_scheduled_posts_member_read_by_slug.sql`:
```sql
drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts for select to authenticated
  using (
    public.is_member_of((select id from public.clients where slug = scheduled_posts.client_id))
    and not exists (
      select 1 from public.content_jobs j
      where j.job_id_motor = scheduled_posts.job_id and j.client_visible = false
    )
  );
```
- `scheduled_posts.client_id` es SLUG; `clients.slug` UNIQUE → un uuid.
- `is_member_of(null)` (slug inexistente) → false → fail-closed.
- Mantiene la policy de equipo. Un miembro ve **solo** sus scheduled_posts.
- **Guarda de visibilidad (resuelve Q-B del builder-check):** el `NOT EXISTS` oculta
  un post solo si su `content_jobs` está **explícitamente** `client_visible=false`.
  Live mode (sin `content_jobs`) → visible; review mode con `client_visible=true` →
  visible; review mode con `client_visible=false` → oculto (preserva el gate de P1).
  Así habilita live sin exponer nada deliberadamente escondido.

> **Precondición verificada (Q-A):** para stacked, el `clients` row existe
> (slug=stacked) y el usuario `stacked@creapp.com.ar` (role `client`) ya es
> miembro (`client_members`, role owner). RLS resuelve; el feature mostrará datos.
> (brand_colors/logo pueden venir null → tema default + nombre; aceptable.)

### 4.2 Datos — campaña sintética "en vivo" (`portalService`)
`getMyCampaigns()`:
1. Lee `client_public`. Sin cliente → `[]`.
2. Lee `content_campaigns`. Si hay → flujo normal (igual que hoy).
3. Si 0 campañas: consulta `scheduled_posts` del cliente (ya legible por 4.1). Si
   hay ≥1 → devuelve `[buildLiveCampaign(client, rows)]`; si 0 → `[]`
   ("preparándose", igual que hoy).
- `buildLiveCampaign(client, rows)` (puro, testeable) → `PortalCampaign` con:
  `{ id: '__live__', live: true, title: null, month: <YYYY-MM del scheduled_at más
  temprano>, concept: null, aesthetic: null, client, pieces: [] }`.
- `PortalCampaign` suma `live?: boolean`.

### 4.3 `PortalView` — modo en vivo
- **MUST-DO (resuelve el gotcha del builder-check):** `campaignViewState`
  (`portalView.ts`) hoy devuelve `'empty'` cuando `pieces.length === 0`, y
  `PortalView` corta a "Tu campaña se está preparando" **antes** de montar el shell.
  Una campaña live tiene `pieces:[]` → sin arreglo, nunca monta. `campaignViewState`
  (o un pre-check en `PortalView`) debe tratar `campaign.live === true` como
  `'ready'`. Es el paso de mayor impacto.
- `campaignId` que se pasa a Home/Calendario = `campaign.live ? null : campaign.id`
  (en vivo, sin filtro de campaña; pasar `campaign.id='__live__'` haría que
  `mapScheduledRows` filtre y tire todas las filas).
- Revisión en vivo (pieces vacío): `PortalReviewSection` muestra estado honesto
  "Tu campaña ya está publicada — no hay piezas para revisar acá", en vez de montar
  `PieceReview` con 0 piezas.
- `pendingCount = 0` (natural).

### 4.4 `PortalHome` — tarjetas en modo en vivo
- Home ya carga el calendario (`getMyCalendarPieces(campaignId)`).
- Si `campaign.live`: las tarjetas de estado se derivan del **calendario**, no de
  `campaign.pieces`:
  - **Publicaciones** (total del calendario), **Publicadas** (`published`),
    **Próxima** (`nextPublication`). Oculta "aprobadas/esperan tu mirada" (no aplica).
- Si no es live: tarjetas actuales (piezas/aprobadas/esperan/próxima).
- El rail "Tus piezas" en vivo usa las piezas del calendario (portadas) → click al
  Calendario (no a Revisión). Atajos: sin Revisión en vivo (o Revisión deshabilitada).

### 4.5 `PortalShell` — Revisión en vivo
- En vivo, el ítem Revisión del sidebar se oculta (nada para revisar). Prop nueva
  `hideReview?: boolean` (o derivar de pendingCount+live). Home/Calendario/Insights
  quedan.

## 5. Qué queda al builder
- Derivación exacta del `month` del live (del `scheduled_at` más temprano o más
  representativo) y formato.
- Si Revisión en vivo se **oculta** del sidebar o se muestra con nota (default:
  ocultar).
- Copy de los estados en vivo.
- Tests: `buildLiveCampaign` (month, pieces=[], live=true), y la derivación de
  tarjetas de Home en vivo si se extrae a helper. RLS por verificación manual +
  el chequeo read-only ya hecho.

## 6. Riesgos
- **RLS reshape**: la nueva policy amplía lo que el miembro ve (sus scheduled_posts
  sin gate de content_jobs). Mitigación: scoping estricto por slug→uuid único +
  fail-closed; un cliente solo ve lo suyo. Verificar en vivo (como P1).
- **Tema del cliente en vivo**: sin aesthetic → default + acento de marca. Para
  stacked (cyber_hud real) se verá con el tema base. Aceptable; si molesta, un
  follow-up sincroniza el aesthetic del cliente al portal.
- **Precondición**: el usuario cliente debe ser miembro (`client_members`) del
  cliente para que RLS/requireMember lo reconozcan (onboarding, dato del usuario).
