# Portal — Plan 1: Alta de cliente + acceso (contraseña) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar de alta a un cliente desde el admin (crea su usuario rol `client`, lo liga a su marca y le manda un email branded con acceso), y que el cliente entre a su portal con email + contraseña.

**Architecture:** Edge function `invite-client` (service_role) crea el usuario vía `generateLink` y devuelve un link de activación; el front manda ese link por Resend (patrón existente). El cliente activa en `/portal/activar` (setea contraseña) y vuelve con `/portal/login` (email+password). El alta y el estado de acceso viven en una acción nueva de `ClientCampaignCard` dentro del tracker "Marketing & Campañas".

**Tech Stack:** React 19 + TS + Vite + Tailwind (admin) / CSS portal (`portal.css`); `@supabase/supabase-js` (anon front, service_role en edge fn); Supabase Edge Functions (Deno); Vercel serverless (`api/`); Resend.

**Spec:** `docs/superpowers/specs/2026-11-09-portal-onboarding-avisos-historias-design.md` (Parte 1 + §9).

## Global Constraints

- Front: solo `anon` + RLS; `service_role` SOLO en edge functions. Cero secretos en el cliente.
- Copy 100% es-AR (voseo).
- `git add` SOLO los archivos de cada task (hay WIP del usuario en el working tree; NUNCA `git add -A`).
- No romper tabs del admin ni el routing por `?tab=`.
- Migraciones idempotentes; su aplicación se difiere al usuario en el SQL Editor (como los planes previos).
- El rol del cliente DEBE resolver a `client` (metadata `role='client'` → trigger `handle_new_user` → `user_profiles.role='client'`). Si el perfil quedara en `vendedor`, el cliente heredaría acceso de equipo.
- Remitente email `RESEND_FROM_EMAIL` (`CreAPP <equipo@creapp.com.ar>`), base `https://creapp.com.ar`.

## Review Focus

- **Email ya del equipo (admin/vendedor):** dar de alta ese email como cliente NO debe darle acceso de cliente ni, peor, mezclar roles. La edge function lo rechaza con error claro. → Task 2.
- **Enum `user_role` sin `'client'`:** si el valor no está en el enum, el `insert`/cast del trigger falla y el alta revienta. Verificar/asegurar `'client'` en el enum. → Task 1.
- **Hash de invite de Supabase secuestrado a `/admin/set-password`:** el `AuthRedirectHandler` hoy manda CUALQUIER `type=invite/recovery` a `/admin/set-password`; el cliente debe quedarse en `/portal/activar`. → Task 6.
- **Re-alta de un cliente ya invitado:** segundo "Dar de alta"/"Reenviar" no debe duplicar membership ni romper (idempotente, `recovery` link). → Task 2.
- **Alta sin email o email inválido:** la UI no envía; la edge function valida y responde error es-AR, sin crear usuario a medias. → Task 2/5.

---

### Task 1: Migración de prerrequisitos (enum `client` idempotente)

**Files:**
- Create: `supabase/migrations/20261109130000_portal_client_onboarding.sql`

**Interfaces:**
- Produces: enum `public.user_role` garantiza el valor `'client'`.

- [ ] **Step 1: Escribir la migración** — idempotente: `alter type public.user_role add value if not exists 'client';` con comentario de que el redirect allowlist (`<base>/portal/activar`, `<base>/portal/login`) se agrega en el dashboard de Supabase (Auth → URL Configuration), diferido al usuario.
- [ ] **Step 2: Verificar** — `select enumlabel from pg_enum e join pg_type t on e.enumtypid=t.oid where t.typname='user_role';` incluye `client`. (Aplicación diferida al usuario en el SQL Editor.)
- [ ] **Step 3: Commit** (`git add supabase/migrations/20261109130000_portal_client_onboarding.sql`).

---

### Task 2: Edge function `invite-client`

**Files:**
- Create: `supabase/functions/invite-client/index.ts`

**Interfaces:**
- Produces (HTTP POST, body JSON): entrada `{ clientId: string, email: string, fullName?: string }`; salida `{ success: true, activationLink: string, userId: string, isNew: boolean }` o `{ error: string, code?: string }` con status 400/403/500.
- Lógica:
  1. Valida `clientId` y `email` (no vacíos; email con formato). Sin ellos → 400.
  2. Busca el usuario por email (admin API). Si existe y su `role` (de `user_profiles` o metadata) es `admin` o `vendedor` → **403** `{ error: 'Ese email ya pertenece al equipo, no se puede dar de alta como cliente.', code: 'email_is_team' }`.
  3. Si NO existe: `admin.auth.admin.generateLink({ type: 'invite', email, options: { data: { full_name, role: 'client' }, redirectTo: '<base>/portal/activar' } })` → `isNew=true`, `userId` del resultado, `activationLink = data.properties.action_link`.
  4. Si YA existe como `client`: `generateLink({ type: 'recovery', email, options: { redirectTo: '<base>/portal/activar' } })` → `isNew=false`.
  5. `insert into client_members (client_id, user_id, role) values (clientId, userId, 'owner') on conflict (client_id, user_id) do nothing`.
  6. Devuelve `{ success, activationLink, userId, isNew }`.
- Patrón base: clonar la estructura de `supabase/functions/manage-team/index.ts` (CORS, `admin` client con `SUPABASE_SERVICE_ROLE_KEY`, helper `json()`). `<base>` = `Deno.env.get('PUBLIC_SITE_URL') ?? 'https://creapp.com.ar'`.

- [ ] **Step 1: Implementar** `supabase/functions/invite-client/index.ts` con la lógica de arriba (Deno; mismo scaffold que `manage-team`).
- [ ] **Step 2: Deploy** — `supabase functions deploy invite-client` (diferido al usuario si no hay CLI/login; dejar nota).
- [ ] **Step 3: Verificar (manual, documentado)** — tres invocaciones con `supabase.functions.invoke('invite-client', …)` o curl: (a) email nuevo → `success, isNew:true, activationLink` presente + fila en `client_members`; (b) mismo email otra vez → `isNew:false`, sin duplicar membership; (c) email de un `admin`/`vendedor` → 403 `email_is_team`. Anotar resultados.
- [ ] **Step 4: Commit** (`git add supabase/functions/invite-client/index.ts`).

---

### Task 3: Email branded de acceso (Resend)

**Files:**
- Create: `api/send-portal-invite.js`
- Modify: `src/lib/emailService.ts` (agregar `sendPortalInvite`)

**Interfaces:**
- Consumes: `activationLink`, `brandName`, `email`, `fullName` (de Task 2 + cliente).
- Produces: `sendPortalInvite(params: { email: string; fullName?: string; brandName: string; activationLink: string }): Promise<{ success: boolean; error?: string }>` en `emailService.ts`, que hace `POST /api/send-portal-invite` (con fallback directo a Resend igual que `sendWelcomeEmail`). `api/send-portal-invite.js`: handler estilo `send-welcome-email.js` (CORS, POST, `RESEND_API_KEY`, `from = RESEND_FROM_EMAIL`), asunto `"Tu portal de campañas · ${brandName}"`, HTML es-AR con CTA "Activar mi acceso" → `activationLink`.

- [ ] **Step 1: Escribir el test que falla** — `src/lib/emailService.test.ts` (node:test): `sendPortalInvite` con `fetch` mockeado que devuelve `{ ok: true }` resuelve `{ success: true }` y hace POST a `/api/send-portal-invite` con el body `{ email, fullName, brandName, activationLink }`. (Mock de `globalThis.fetch`.)
- [ ] **Step 2: Correr y verificar que falla** — `npm test` (función inexistente).
- [ ] **Step 3: Implementar** `sendPortalInvite` en `emailService.ts` + `api/send-portal-invite.js` (clon de `send-welcome-email.js` con el template nuevo).
- [ ] **Step 4: Correr tests** — `npm test` verde.
- [ ] **Step 5: Commit** (`git add src/lib/emailService.ts src/lib/emailService.test.ts api/send-portal-invite.js`).

---

### Task 4: Servicio de onboarding + estado de acceso (datos + mapper puro)

**Files:**
- Create: `src/lib/portalOnboardingService.ts`, `src/lib/portalOnboardingMapper.ts`, `src/lib/portalOnboardingMapper.test.ts`

**Interfaces:**
- Consumes: Task 2 (`invite-client`), Task 3 (`sendPortalInvite`).
- Produces:
  - Tipo `ClientAccessStatus = 'none' | 'invited' | 'active'`.
  - `deriveAccessStatus(members: { user_id: string }[], lastSignIns: Record<string, string | null>): ClientAccessStatus` (PURO): `none` si no hay members; `active` si algún member tiene `lastSignIn` no nulo; `invited` en otro caso.
  - `getClientAccess(clientId: string): Promise<{ status: ClientAccessStatus; email: string | null }>` — lee `client_members` del cliente (RLS equipo) + (si accesible) último `last_sign_in`; `email` = del member si hay (via perfil) o null.
  - `invitePortalClient(args: { clientId: string; brandName: string; email: string; fullName?: string }): Promise<{ success: boolean; error?: string }>` — invoca `invite-client`, y con el `activationLink` devuelto llama `sendPortalInvite`. Propaga el error de la edge function (ej. `email_is_team`) como `{ success:false, error }`.

- [ ] **Step 1: Escribir el test que falla** — `portalOnboardingMapper.test.ts` (node:test): `deriveAccessStatus` → `[]`⇒`'none'`; `[{user_id:'u'}]` con `{u:null}`⇒`'invited'`; `[{user_id:'u'}]` con `{u:'2026-...'}`⇒`'active'`; dos members, uno con login ⇒ `'active'`.
- [ ] **Step 2: Correr y verificar que falla** — `npm test`.
- [ ] **Step 3: Implementar** `portalOnboardingMapper.ts` (puro) + `portalOnboardingService.ts` (`getSupabase()` + `supabase.functions.invoke('invite-client', …)` + `sendPortalInvite`).
- [ ] **Step 4: Correr tests** — `npm test` verde.
- [ ] **Step 5: Commit** (solo esos archivos).

---

### Task 5: UI de alta + chip de estado en `ClientCampaignCard`

**Files:**
- Modify: `src/components/admin/campaigns/ClientCampaignCard.tsx`
- Create (si ayuda): `src/components/admin/campaigns/PortalAccessControl.tsx`

**Interfaces:**
- Consumes: Task 4 (`getClientAccess`, `invitePortalClient`, `ClientAccessStatus`). El `client` ya trae `id`, `slug`, `name`, `logoUrl` (de `contentTrackerTypes`).

- [ ] **Step 1** — En el header del card, un control de acceso: carga `getClientAccess(client.id)` (useEffect, loading), muestra un **chip**: *Sin alta* (none) / *Invitado* (invited) / *Activo* (active) con colores claros (estética admin Tailwind). Botón: **"Dar de alta al portal"** (si `none`) o **"Reenviar acceso"** (si `invited`/`active`).
- [ ] **Step 2** — Al apretar, un mini-form (inline o modal liviano) pide **email** (requerido) y **nombre de contacto** (opcional); confirma con `invitePortalClient({ clientId: client.id, brandName: client.name, email, fullName })`. Éxito → toast/success es-AR ("Le enviamos el acceso a {email}") + refresca el chip. Error → mensaje es-AR (incluye el caso `email_is_team` tal cual: "Ese email ya pertenece al equipo…"). `busy` deshabilita el botón.
- [ ] **Step 3** — `npm run build` sin errores nuevos; el card muestra chip + acción; el estado vacío/validación (email vacío no envía) funciona.
- [ ] **Step 4: Commit** (solo tus archivos).

---

### Task 6: Portal login + activación (`/portal/login`, `/portal/activar`)

**Files:**
- Create: `src/pages/portal/PortalLogin.tsx`, `src/pages/portal/PortalActivate.tsx`
- Modify: `src/App.tsx` (rutas + `AuthRedirectHandler`), `src/components/auth/PortalGuard.tsx`

**Interfaces:**
- Consumes: `useAuth()` (sesión/rol), `supabase.auth.signInWithPassword`, `supabase.auth.updateUser`, `homePathForRole`.

- [ ] **Step 1** — `PortalLogin.tsx` (estética portal `portal.css`): form email+contraseña → `supabase.auth.signInWithPassword`; en éxito navega a `/portal`; link "Olvidé mi contraseña" (dispara `invite-client` recovery vía un endpoint liviano o muestra "pedíselo a tu agencia" — MVP: texto). `PortalActivate.tsx`: toma el hash de invite/recovery (Supabase ya crea sesión temporal), pide **nueva contraseña** + confirmación → `supabase.auth.updateUser({ password })` → navega a `/portal`.
- [ ] **Step 2** — `App.tsx`: agregar rutas públicas `"/portal/login" → <PortalLogin/>` y `"/portal/activar" → <PortalActivate/>` (lazy). En `AuthRedirectHandler`, **no** secuestrar cuando `location.pathname.startsWith('/portal')` (agregar `&& !location.pathname.startsWith('/portal')` a la condición), para que el invite del cliente (redirectTo `/portal/activar`) se quede ahí.
- [ ] **Step 3** — `PortalGuard.tsx`: cambiar el `return <Navigate to="/admin/login" replace />` del caso `'login'` por `"/portal/login"` (el cliente no cae en el login del equipo).
- [ ] **Step 4: Escribir el test que falla** — `src/lib/portalAccess.test.ts` (ya existe suite): agregar que `resolvePortalAccess` con `user=null` ⇒ `'login'` (el guard ya lo manda a `/portal/login`); y un test de humo de que `homePathForRole('client')==='/portal'`. (El comportamiento de navegación se valida en browser.)
- [ ] **Step 5: Correr tests** — `npm test` verde.
- [ ] **Step 6: Verificar en browser** — `npm run dev`: sin sesión, `/portal` redirige a `/portal/login`; con un cliente dado de alta (Task 2–5) seguir el link del email → `/portal/activar` → setear contraseña → entra a `/portal`; cerrar sesión y volver a entrar por `/portal/login`.
- [ ] **Step 7: Commit** (solo tus archivos).

---

## Notas de handoff

- **Prerrequisitos del usuario (dashboard Supabase):** aplicar la migración de Task 1; agregar `https://creapp.com.ar/portal/activar` y `/portal/login` al allowlist de Redirect URLs (Auth → URL Configuration); confirmar que el enum `user_role` ya tiene `client` (Plan 2). Deploy de la edge function `invite-client`.
- **Datos de prueba:** el cliente `consultorio_alvarez` ya existe en `clients` con su campaña; usar un email de prueba propio para el alta end-to-end.
- **Siguiente (no en este plan):** Parte 2 (avisos equipo), Parte 3 (avisos cliente + multi-campaña), Parte 4 (historias).
