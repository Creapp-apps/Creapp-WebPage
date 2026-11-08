# Fusión Creador→CreAPP — Plan 3: Portal del Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un portal donde el cliente entra con su cuenta y vive un **unveiling cinematográfico** de su campaña del mes — branding e identidad arriba, piezas agrupadas por tipo (Reels · Carruseles · Historias) en rieles horizontales, cero jerga técnica — y puede **aprobar / pedir cambios / comentar** por pieza, con todo viajando a la agencia bajo RLS.

**Architecture:** Front React (Vite) en CreAPP, ruta `/portal`, consumiendo Supabase bajo las RLS del Plan 2 (rol `client` + `client_members`). Lee identidad de marca y piezas, escribe `content_approvals`. Se cierra el gate del Plan 2 (exposición de columnas internas de `clients`) con una vista pública. El motor suma al push la subida del **logo real del cliente** a R2 + la paleta/concepto, para que el portal muestre branding real (nunca placeholders).

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind, `@supabase/supabase-js`, `react-router-dom`; motor Python (extensión del puente de push del Plan 1).

**Spec / Norte visual:** diseño `docs/superpowers/specs/2026-11-07-fusion-creador-creapp-design.md`; **mockup aprobado** (fuente de verdad visual): `docs/superpowers/mockups/2026-11-07-portal-cliente.html`.

## Global Constraints

- **Logos REALES siempre, cero AI slop (mandato del usuario):** el logo del cliente sale de su asset real (`storage/clients/<slug>/logo*` → subido a R2, URL en `clients.logo_url`); el logo de CreAPP sale de `public/creapp-logo-full.png` (o `CREAPP LOGO VECTOR.png`). Prohibido monogramas generados, iniciales tipográficas de relleno o íconos genéricos como marca. Si falta el logo real de un cliente, se muestra su **nombre** en tipografía de marca (no un monograma inventado), y se registra como pendiente — nunca se fabrica un logo.
- **Cero info técnica en el portal:** nada de `job_id`, manifiestos, nombres de archivo, estados internos. Todo en lenguaje de cliente (es-AR).
- **Branding cliente-primero + CreAPP co-acreditada:** paleta y layout del cliente (de `clients.brand_colors`); CreAPP presente de forma sutil (badge "Hecho por CreAPP" con su gradiente violeta→magenta y logo real, top-right + footer), sin competir con la paleta del cliente. Como en el mockup.
- **Seguridad:** el portal usa la `anon` key + RLS (nunca service_role en el front). El cliente solo ve lo suyo (Plan 2). Se cierra el gate de columnas de `clients` (ver Task 1).
- **Visual = el mockup:** rieles horizontales por tipo (barra de scroll oculta + flechas ‹ › al hover + degradé de borde), tarjetas con altura capada, botones apilados (Aprobar primario + Pedir cambios como link), footer con wrap. Dark cinematográfico. Replicar el look del mockup, no reinventarlo.
- **Un cliente `client` nunca escala a equipo** (Plan 2): el guard del portal y el de admin se excluyen por rol.
- Repos: CreAPP (git) para front + migración; motor (git) para la extensión del push. `.env`/service_role solo en el motor.

## Review Focus

- **Cliente sin piezas / campaña vacía:** el portal debe mostrar un estado vacío elegante ("Tu campaña se está preparando"), no romper ni mostrar error técnico. → test en Task 4.
- **Logo de cliente ausente:** cae al nombre en tipografía de marca, nunca a un monograma inventado ni a un ícono genérico. → test en Task 4.
- **Doble aprobación / cambio de decisión:** el cliente aprueba y luego pide cambios (o al revés) — `content_approvals` es append-only; el estado vigente lo marca la última fila; la UI refleja la última decisión sin romper. → test en Task 3.
- **Fuga de columnas internas de `clients`:** un cliente no puede leer columnas CRM internas de `clients` (gate del Plan 2). → test en Task 1 (extiende el test RLS).
- **Rol equivocado en el portal:** un usuario `admin`/`vendedor` que entra a `/portal` se redirige a `/admin`; un `client` que entra a `/admin` se redirige a `/portal`. → test en Task 5.

---

### Task 1: Cierre del gate + columnas de branding (migración CreAPP)

**Files:**
- Create: `supabase/migrations/20261107160000_portal_branding.sql`
- Modify: `supabase/tests/rls_client_access_test.sql` (extender para el gate de columnas)

**Interfaces (consume Task 2 y 3):**
- `public.clients` gana `logo_url text`, `brand_colors jsonb` (ej. `{"primary":"#002655","accent":"#9A5B34","light":"#F4F1EA"}`).
- `public.content_campaigns` gana `concept text` (concepto/temática del mes, texto de cliente).
- Vista `public.client_public` (columnas públicas): `id, slug, name, logo_url, brand_colors`, filtrada por `public.is_member_of(id)`, legible por `authenticated`. El rol `client` lee marca SOLO por esta vista.
- Se **elimina** la policy `"Members can read own client"` sobre la tabla cruda `public.clients` (el cliente deja de leer la tabla cruda; el equipo conserva su policy de equipo).

- [ ] **Step 1: Escribir la migración**
  - `alter table public.clients add column if not exists logo_url text;` + `add column if not exists brand_colors jsonb;`
  - `alter table public.content_campaigns add column if not exists concept text;`
  - `create or replace view public.client_public with (security_invoker = false) as select id, slug, name, logo_url, brand_colors from public.clients where public.is_member_of(id);` (security_invoker=false → la vista accede a la tabla como su owner, salteando la RLS de `clients`; el filtro `is_member_of` usa `auth.uid()` del invocador, así que cada cliente ve solo lo suyo y solo estas columnas).
  - `grant select on public.client_public to authenticated;`
  - `drop policy if exists "Members can read own client" on public.clients;` (cierra el gate: el cliente ya no lee la tabla cruda).

- [ ] **Step 2: Extender el test RLS para el gate**
  En `supabase/tests/rls_client_access_test.sql`, agregar dentro del bloque de uA: (a) `select` sobre `public.clients` directo debe devolver 0 filas (ya sin policy de cliente); (b) `select` sobre `public.client_public` devuelve 1 fila (la de A) con las columnas públicas; (c) un `select` de A sobre `client_public` filtrando por el id de B devuelve 0.

- [ ] **Step 3: Aplicar y verificar** (SQL Editor del proyecto `yjrqpjlzyxivwpfcatvt`, o `supabase db push`). Correr el test extendido; debe terminar con `OK` + rollback. Verificación diferida al usuario si no hay DB local (ruling del controlador, como Planes 1-2).

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/20261107160000_portal_branding.sql supabase/tests/rls_client_access_test.sql
git commit -m "feat(portal): branding en clients + vista client_public (cierra gate de columnas) + concepto de campaña"
```

---

### Task 2: Motor — subir logo del cliente + branding en el push

**Files:**
- Modify: `src/integrations/supabase_sync.py` (nuevos campos en upsert_client / upsert_campaign)
- Modify: `src/integrations/portal_push.py` (subir logo a R2; poblar brand_colors/concept desde el dossier)
- Modify: `src/integrations/cloud_storage.py` sólo si hace falta un helper de subida de imagen suelta (si no, reusar `upload_file`)
- Test: `tests/test_portal_push.py` (extender)

**Interfaces:**
- Consume: `CloudStorageManager.upload_file` (existente, R2); `client_profile.json` (`brand_colors`), campaign spec (`concept`/tema).
- Produce: `upsert_client(..., logo_url=None, brand_colors=None)`; `upsert_campaign(..., concept=None)`; `push_job_to_portal` sube `storage/clients/<slug>/logo*.{png,jpg}` (el más apropiado, preferir `logo_white.png`/transparente si existe) a R2 bajo `clients/<slug>/brand/logo.png` una sola vez (idempotente) y setea `clients.logo_url`; lee `brand_colors` del `client_profile.json` y `concept` del `campaign_spec`.

- [ ] **Step 1: Test que falla** — en `tests/test_portal_push.py`, un test que monkeypatchea upload + sync y verifica que `push_job_to_portal` (a) sube el logo del cliente y pasa `logo_url` a `upsert_client`, (b) pasa `brand_colors` leído de un `client_profile.json` fixture, (c) pasa `concept` a `upsert_campaign`. Si no hay logo real en disco, `logo_url` queda None y NO se inventa nada (assert).
- [ ] **Step 2: Correr y verificar que falla** — `.venv/bin/python -m pytest tests/test_portal_push.py -v`.
- [ ] **Step 3: Implementar** — extender `supabase_sync` (nuevos kwargs, el `_upsert` ya omite None) y `portal_push` (resolver el logo real del cliente en `storage/clients/<slug>/`, subirlo con `upload_file` a key estable, setear logo_url; leer brand_colors/concept del dossier/spec). Nunca generar un logo; si falta, logo_url=None.
- [ ] **Step 4: Correr tests** — verde, pristine.
- [ ] **Step 5: Commit** (motor es git).

---

### Task 3: Portal — capa de datos (service + tipos)

**Files:**
- Create: `src/lib/portalService.ts`
- Create/Modify: `src/lib/types.ts` (tipos del portal) o un `portalTypes.ts`
- Test: `src/lib/portalService.test.ts` (o el runner de tests del repo; si no hay, un test de integración mínimo documentado)

**Interfaces (consume Task 4):**
- `type PortalPiece = { id, type: 'reel'|'carousel'|'story', title, caption, coverUrl, mediaUrl, status: 'sent'|'approved'|'changes_requested', slides?: string[] }`
- `type PortalCampaign = { id, title, month, concept, aesthetic, client: { name, logoUrl, brandColors } , pieces: PortalPiece[] }`
- `getMyCampaign(): Promise<PortalCampaign | null>` — lee `client_public` + `content_campaigns` + `content_jobs` + `content_assets` bajo RLS (la más reciente del cliente), arma la estructura agrupable por tipo, mapea assets (`mp4`→mediaUrl, `cover_9_16`→coverUrl, `slide`→slides[]), deriva el `status` vigente de cada pieza desde la última fila de `content_approvals`.
- `submitDecision(jobId: string, decision: 'approved'|'changes_requested', comment?: string): Promise<void>` — inserta en `content_approvals` (`client_user_id = auth.uid()`), bajo RLS.

- [ ] **Step 1: Test que falla** — `getMyCampaign` arma `PortalPiece[]` correctamente desde filas mock de Supabase (agrupa por type, mapea assets, deriva status por última approval); `submitDecision` arma el insert correcto. Mockear el cliente Supabase.
- [ ] **Step 2: Correr y verificar que falla.**
- [ ] **Step 3: Implementar** `portalService.ts` usando `getSupabase()` (anon + RLS). Nada de service_role. Status vigente = última `content_approvals.created_at` por job (o 'sent' si no hay).
- [ ] **Step 4: Correr tests** — verde.
- [ ] **Step 5: Commit.**

---

### Task 4: Portal — UI (ruta + componentes, norte = el mockup)

**Files:**
- Create: `src/pages/PortalView.tsx` (la página)
- Create: `src/components/portal/CampaignHero.tsx`, `PieceRail.tsx`, `PieceCard.tsx`, `PiecePlayer.tsx` (modal de preview + Pedir cambios/comentario), `AgencyBadge.tsx`
- Modify: `src/App.tsx` (ruta `/portal`)
- Modify: `src/styles/*` si hace falta (o Tailwind inline)

**Interfaces:** consume `portalService` (Task 3). Visual: **replicar `docs/superpowers/mockups/2026-11-07-portal-cliente.html`** (hero con concepto + paleta + tags; rieles por tipo con flechas y barra oculta; tarjetas con altura capada y botones apilados; footer con progreso y "Aprobar pendientes"; badge CreAPP con logo real + footer credit).

- [ ] **Step 1: Ruta + guard** — en `App.tsx`, `<Route path="/portal" element={<PortalGuard><PortalView/></PortalGuard>} />` (PortalGuard de Task 5). Lazy load.
- [ ] **Step 2: Componentes** — construir según el mockup:
  - `CampaignHero`: "Tu agencia te presenta", título del mes (serif), **concepto del mes**, swatches de `brandColors`, tags de estilo; logo real del cliente (de `logoUrl`) en el top-bar (si falta → nombre en serif, sin monograma inventado); `AgencyBadge` (logo real CreAPP `public/creapp-logo-full.png` + "Hecho por CreAPP" gradiente).
  - `PieceRail` (por tipo): scroll horizontal, barra oculta, flechas ‹ › al hover, degradé de borde, snap.
  - `PieceCard`: preview (cover/gradiente si falta), chip de estado (✓ Aprobada / Espera tu mirada), título humano, bajada, acciones apiladas (Aprobar → `submitDecision('approved')`; Pedir cambios → abre `PiecePlayer`/panel con textarea → `submitDecision('changes_requested', comment)`).
  - `PiecePlayer`: modal enfocado con el MP4 (mediaUrl de R2) o carrusel de slides, caption, y los botones de decisión + comentario.
  - Footer fijo con progreso ("X de N aprobadas") y "Aprobar pendientes".
- [ ] **Step 3: Estados borde** — campaña vacía → estado "Tu campaña se está preparando"; sin logo → nombre en serif (no monograma). Montar un smoke test (Playwright o el runner del repo) o, si no hay infra de test de UI, un test de render de `PieceCard`/`CampaignHero` con datos mock (incl. logo ausente y lista vacía) verificando que NO aparece monograma inventado ni texto técnico.
- [ ] **Step 4: Verificar en el navegador** — `npm run dev`, abrir `/portal` logueado como un cliente de prueba; comparar contra el mockup. Correr `node scripts/test_frontend_integrity.js` (gate del repo, AGENTS §26) para asegurar cero ReferenceErrors / globals huérfanas.
- [ ] **Step 5: Commit.**

---

### Task 5: Auth de cliente — rol `client`, guard y ruteo por rol

**Files:**
- Modify: `src/context/AuthContext.tsx` (`UserRole` += `'client'`)
- Create: `src/components/auth/PortalGuard.tsx`
- Modify: `src/components/auth/AuthGuard.tsx` (un `client` que cae en admin → `/portal`)
- Modify: `src/pages/admin/AdminLogin.tsx` o crear `src/pages/PortalLogin.tsx` (login del cliente; tras login, redirigir por rol: `client`→`/portal`, equipo→`/admin`)

**Interfaces (consume Task 4):** `PortalGuard` permite solo `role === 'client'`; sin user → `/portal/login` (o el login compartido); user de equipo → `/admin`.

- [ ] **Step 1: Test que falla** — un test de `PortalGuard` (render con role mock): `client` → renderiza children; `admin`/`vendedor` → `<Navigate to="/admin">`; sin user → login. Y que `UserRole` incluye `'client'`.
- [ ] **Step 2: Correr y verificar que falla.**
- [ ] **Step 3: Implementar** — extender `UserRole`; `PortalGuard` (análogo a `AuthGuard`); en `AuthGuard`, si `role === 'client'` redirigir a `/portal` en vez de `/admin?tab=pipeline`; login con redirección por rol. Ruta `/portal/login` si se separa.
- [ ] **Step 4: Correr tests** + `node scripts/test_frontend_integrity.js`.
- [ ] **Step 5: Commit.**

---

## Notas de handoff
- **Prerrequisito usuario:** aplicar la migración de Task 1 + correr el test RLS extendido (SQL Editor). Para probar el portal end-to-end hace falta un **usuario cliente de prueba** (crear en Supabase Auth con `raw_user_meta_data.role='client'` + fila en `client_members` apuntando a un cliente real que ya tenga piezas pusheadas, ej. `cardoso_propiedades`). El re-push de ese cliente (motor, Task 2) subirá su logo real + branding.
- **Invite real de clientes** (dar de alta usuarios cliente desde el admin, setear role='client', crear `client_members`) + **botón "Enviar al cliente"** + aviso Resend = **Plan 4** (no acá).
- **Estudio embebido (Cloudflare Tunnel)** = Plan 5.
- Riesgo a vigilar: que el portal nunca muestre un logo genérico — si falta el real, nombre en serif. El test de Task 4 lo bloquea.
