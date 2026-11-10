# Portal — Plan 3: Avisos al cliente (agrupados) + multi-campaña en el portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el equipo, cuando decide, mande al cliente UN email agrupado de "novedades en tu campaña de [mes]" (sin spam) con deep-link a esa campaña; y que el portal muestre TODAS las campañas del cliente con un selector + deep-link, no solo la más nueva.

**Architecture:** Una acción explícita del equipo "Enviar novedades al cliente" por campaña (en `CampaignGroup`) junta las piezas visibles/cambiadas desde el último aviso (registradas en una tabla `content_client_notifications`) y manda un email branded (Resend, patrón existente) con link a `/portal?campaign=<id>`. El portal (`portalService` + `PortalView`) pasa de LIMIT 1 a traer todas las campañas del cliente, con un selector por mes y soporte de `?campaign=<id>`.

**Tech Stack:** Supabase (migración + RLS), React 19 + TS + Vite, Resend (`api/` serverless + `emailService.ts`), react-router (`useSearchParams`).

**Spec:** `docs/superpowers/specs/2026-11-09-portal-onboarding-avisos-historias-design.md` (Parte 3 + §8.1, §8.4).

## Global Constraints

- Front: solo `anon` + RLS; `service_role` nunca en el cliente (salvo el serverless de email, que ya usa su propia key). Copy 100% es-AR.
- `git add` SOLO los archivos de cada task (hay WIP ajeno; NUNCA `git add -A`).
- Migraciones idempotentes; aplicación diferida al usuario (SQL Editor).
- No romper el portal del cliente actual ni el tracker del admin.
- El aviso al cliente es **explícito** (el equipo decide cuándo), **agrupado** (un email por tanda, nunca uno por pieza).
- Remitente `RESEND_FROM_EMAIL`; base `https://creapp.com.ar`; deep-link `/portal?campaign=<id>`.
- Email del cliente (owner) = vía `client_members` → `user_profiles.email` (mismo origen que Parte 1 `getClientAccess`).

## Review Focus

- **Anti-spam / idempotencia del aviso:** dos clicks seguidos de "Enviar novedades" no mandan dos mails iguales con el mismo contenido; el conteo "desde el último aviso" usa `content_client_notifications.sent_at`. → Task 2/3.
- **Sin novedades:** si no hay piezas nuevas/cambiadas desde el último aviso, la acción no manda un email vacío (avisa "no hay novedades"). → Task 3/4.
- **Cliente sin email / sin alta:** si el cliente no tiene usuario con email (no se dio de alta), la acción falla con mensaje claro, no manda a null. → Task 3/4.
- **Deep-link a campaña ajena:** `?campaign=<id>` de otra campaña/cliente → RLS no la devuelve; el portal cae a la más reciente, no rompe. → Task 5.
- **Portal sin campañas / una sola:** el selector no aparece o no estorba con 0/1 campaña. → Task 5.

---

### Task 1: Migración — tabla `content_client_notifications`

**Files:**
- Create: `supabase/migrations/20261109150000_content_client_notifications.sql`

**Interfaces:**
- Produces: tabla `public.content_client_notifications(id uuid pk, campaign_id uuid references content_campaigns on delete cascade, sent_at timestamptz default now(), piece_count int default 0, sent_by uuid references auth.users)`. RLS: el equipo (admin/vendedor) puede `select` e `insert`; nadie más. Índice por `campaign_id, sent_at desc`.

- [ ] **Step 1: Escribir la migración** (idempotente: `create table if not exists`, enable RLS, policies `drop ... if exists` + create para `select` e `insert` restringidas a usuarios cuyo `user_profiles.role in ('admin','vendedor')`). Índice `(campaign_id, sent_at desc)`.
- [ ] **Step 2: Verificar (SQL, diferido)** — documentar: insertar una fila y leerla como equipo funciona; como client no. NO ejecutar.
- [ ] **Step 3: Commit** (solo la migración).

---

### Task 2: Email branded de novedades (Resend)

**Files:**
- Create: `api/send-campaign-update.js`
- Modify: `src/lib/emailService.ts` (agregar `sendCampaignUpdate`)
- Test: `src/lib/emailService.test.ts` (sumar casos)

**Interfaces:**
- Produces: `sendCampaignUpdate(params: { email: string; brandName: string; month: string | null; campaignUrl: string; newCount: number; updatedCount: number }): Promise<{ success: boolean; error?: string }>` en `emailService.ts`, POST a `/api/send-campaign-update` (con fallback directo igual que `sendWelcomeEmail`/`sendPortalInvite`). `api/send-campaign-update.js`: handler estilo los otros (CORS, POST, `RESEND_API_KEY`, `from=RESEND_FROM_EMAIL`), asunto `"Novedades en tu campaña${month? ' de '+month:''} · ${brandName}"`, HTML es-AR con resumen (N piezas nuevas / M actualizadas) y CTA "Ver mi campaña" → `campaignUrl`. Escapar `brandName`/`month` en el HTML.

- [ ] **Step 1: Escribir el test que falla** — en `emailService.test.ts` (node:test): `sendCampaignUpdate` con `fetch` mockeado `{ok:true}` resuelve `{success:true}` y POSTea a `/api/send-campaign-update` con el body correcto; + un test de que el helper de HTML escapa `<`/`&`/`"` en `brandName`.
- [ ] **Step 2: Correr y verificar que falla** — `npm test`.
- [ ] **Step 3: Implementar** `sendCampaignUpdate` + `api/send-campaign-update.js` (clon del patrón, template es-AR nuevo, escaping).
- [ ] **Step 4: Correr tests** — `npm test` verde.
- [ ] **Step 5: Commit** (solo esos 3 archivos).

---

### Task 3: Servicio "Enviar novedades" (datos + conteo + mapper puro)

**Files:**
- Create: `src/lib/campaignNotifyService.ts`, `src/lib/campaignNotifyMapper.ts`, `src/lib/campaignNotifyMapper.test.ts`

**Interfaces:**
- Consumes: Task 2 (`sendCampaignUpdate`), Task 1 (`content_client_notifications`).
- Produces:
  - `countChangesSince(pieces: { clientVisible: boolean; sentAt: string | null }[], lastSentAt: string | null): { newCount: number; updatedCount: number; total: number }` (PURO) — `newCount` = piezas `clientVisible` con `sentAt > lastSentAt` (o todas las visibles si `lastSentAt` es null); `updatedCount` = las demás visibles (o lo que el spec defina; documentar la regla elegida). `total = newCount + updatedCount`.
  - `getCampaignClientEmail(campaignId: string): Promise<string | null>` — del `content_campaigns.client_id` → `client_members` owner → `user_profiles.email`.
  - `notifyCampaignClient(args: { campaignId: string; brandName: string; month: string | null; pieces: {clientVisible:boolean; sentAt:string|null}[] }): Promise<{ success: boolean; error?: string; sent?: boolean }>` — lee el último `content_client_notifications.sent_at` de la campaña; `countChangesSince`; si `total===0` devuelve `{success:true, sent:false}` ("no hay novedades"); si no hay email → `{success:false, error:'...'}`; si no, `sendCampaignUpdate` con `campaignUrl = <base>/portal?campaign=<id>`, y al éxito inserta `content_client_notifications(campaign_id, piece_count, sent_by)`. Propaga errores.

- [ ] **Step 1: Escribir el test que falla** — `campaignNotifyMapper.test.ts` (node:test): `countChangesSince` con `lastSentAt=null` (todas las visibles son new), con un `lastSentAt` intermedio (separa new vs updated), y con 0 visibles (total 0).
- [ ] **Step 2: Correr y verificar que falla** — `npm test`.
- [ ] **Step 3: Implementar** mapper puro + service (`getSupabase()`).
- [ ] **Step 4: Correr tests** — `npm test` verde.
- [ ] **Step 5: Commit** (solo esos 3 archivos).

---

### Task 4: UI "Enviar novedades al cliente" en `CampaignGroup`

**Files:**
- Modify: `src/components/admin/campaigns/CampaignGroup.tsx`

**Interfaces:**
- Consumes: Task 3 (`notifyCampaignClient`). `CampaignGroup` ya tiene `campaign` (`TrackerCampaign`: id, title/month, pieces con `clientVisible`, `sentAt`) + `onChanged`.

- [ ] **Step 1** — Botón **"Enviar novedades al cliente"** en el header del grupo de campaña (estética admin Tailwind, junto a los controles existentes). Al click: `notifyCampaignClient({ campaignId: campaign.id, brandName: <nombre del cliente del contexto>, month: campaign.month, pieces: campaign.pieces })`. `busy` deshabilita. Nota: la marca/brandName y el nombre del cliente los tiene el nivel superior (`ClientCampaignCard`/overview); pasar lo que haya; si `CampaignGroup` no tiene el nombre, aceptar un prop nuevo `brandName` desde el card.
- [ ] **Step 2** — Resultado inline es-AR: éxito con envío → "Le avisamos al cliente (N nuevas, M actualizadas)"; `sent:false` → "No hay novedades para avisar"; error → mensaje es-AR (incl. "El cliente todavía no tiene acceso al portal" si no hay email). Mostrar, si es barato, "último aviso: …" leyendo el último `sent_at` (opcional).
- [ ] **Step 3** — `npm run build` verde; no romper el tracker.
- [ ] **Step 4: Commit** (solo tus archivos; si agregás un prop `brandName`, también el card que lo pasa — mencionarlo).

---

### Task 5: Portal multi-campaña (selector + `?campaign=<id>`)

**Files:**
- Modify: `src/lib/portalService.ts`, `src/pages/PortalView.tsx`
- Test: `src/lib/portalView.test.ts` (si aplica a un helper nuevo de selección)

**Interfaces:**
- Produces:
  - `getMyCampaigns(): Promise<PortalCampaign[]>` — todas las campañas del cliente (orden `month desc, created_at desc`), cada una con sus piezas (igual que hoy pero sin LIMIT 1). Mantener `getMyCampaign` o reemplazar su uso.
  - `PortalView`: lee `?campaign=<id>` con `useSearchParams`; elige esa campaña si existe entre las del cliente, si no la más reciente (fallback). Un **selector** (dropdown por mes/título) visible solo si hay ≥2 campañas; al cambiar, actualiza `?campaign=`. Las piezas/acciones siguen igual por campaña elegida.

- [ ] **Step 1** — `portalService.getMyCampaigns()`: traer todas las campañas + sus piezas/assets/approvals (reusar el mapper actual por campaña; cuidar N+1 con un `in(...)` sobre los ids de jobs de todas las campañas, o por campaña si es más simple — documentar).
- [ ] **Step 2** — `PortalView`: estado de lista de campañas + selección por `?campaign=` (fallback a la más reciente). Selector (≥2). No romper el loader/empty actual.
- [ ] **Step 3** — Si extraés un helper puro de selección (ej. `pickCampaign(campaigns, id)`), test en `portalView.test.ts`. `npm run build` + `npm test` verdes.
- [ ] **Step 4: Commit** (solo tus archivos).

---

## Notas de handoff

- **Prerrequisitos del usuario:** aplicar la migración de Task 1; `SUPABASE_SERVICE_ROLE_KEY` + `RESEND_API_KEY` en Vercel (para el email); el deep-link `/portal?campaign=` ya cae bajo las rutas del portal.
- **Prueba real (tras deploy):** presentar/cambiar piezas de una campaña, apretar "Enviar novedades al cliente", y verificar el email con el resumen + que el link abre esa campaña en el portal; con 2+ campañas, ver el selector.
- **Decisión de producto (confirmada):** el aviso al cliente es explícito y agrupado (no automático, no por pieza).
- **Siguiente (no en este plan):** Parte 4 (historias Álvarez).
