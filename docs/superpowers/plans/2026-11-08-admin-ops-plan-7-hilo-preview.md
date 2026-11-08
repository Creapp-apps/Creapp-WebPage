# Admin Campañas Ops — Plan 7: Hilo bidireccional + preview del equipo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conversación equipo↔cliente por pieza (cronológica, con las decisiones de aprobación integradas y en vivo), y una vista de preview para que el equipo mire una campaña como la ve el cliente — sin loguearse como él.

**Architecture:** 100% CreAPP. El hilo usa la tabla `content_messages` (Plan 5) + `content_approvals` ya existente, fusionados por fecha. Admin y portal comparten un service y un mapper puro del hilo; cada lado escribe con su `author_role` (RLS del Plan 5 lo fuerza). El preview del equipo es una ruta admin que arma la vista del portal leyendo con las policies de equipo. Sin dependencias nuevas.

**Tech Stack:** React 19 + TS + Vite + Tailwind, `@supabase/supabase-js` (anon + RLS + Realtime).

**Spec:** `docs/superpowers/specs/2026-11-08-admin-campaigns-operations-design.md`. **Depende de:** Plan 5 (`content_messages` + policies + realtime) y Plan 6 (estructura admin).

## Global Constraints

- Solo anon + RLS; cero `service_role` en el front. El rol lo decide el contexto (admin escribe `team`, portal escribe `client`); la RLS del Plan 5 rechaza lo demás, no confiar solo en el front.
- Admin dark; portal navy intacto. El hilo no filtra datos técnicos al cliente (sin `job_id_motor`, sin etapas internas en el portal).
- `git add` SOLO archivos propios; WIP del usuario en el working tree (ver Plan 5). NUNCA `git add -A`.
- Copy es-AR. El preview del equipo NO impersona: no usa la sesión del cliente, lee con las policies del equipo.
- `author_role ∈ {team,client}`.

## Review Focus

- **Hilo vacío / solo approvals:** una pieza sin mensajes muestra solo las decisiones (o un vacío elegante), no rompe. → Task 1 (mapper test).
- **Orden cronológico mixto:** messages y approvals intercalados salen ordenados por `created_at` ascendente, sin colisión cuando comparten timestamp. → Task 1 (mapper test).
- **Realtime del hilo respeta RLS:** un mensaje nuevo aparece sin refresh; el cliente NO recibe mensajes de otro cliente (la suscripción filtra por job). → Task 2/3.
- **Autor y rol correctos:** el admin publica `team`+su user; el portal `client`+su user; la UI no deja elegir rol. → Task 2/3.
- **Preview sin fuga:** el preview del equipo muestra la campaña de un cliente leyendo como equipo; no expone la sesión del cliente ni escribe nada. → Task 4.

---

### Task 1: Service + mapper del hilo (puro, compartido)

**Files:**
- Create: `src/lib/threadTypes.ts`, `src/lib/threadMapper.ts` (puro), `src/lib/threadService.ts`
- Test: `src/lib/threadMapper.test.ts`

**Interfaces (consume Tasks 2-4):**
- `ThreadEntry = { id: string; kind: 'message' | 'decision'; authorRole: 'team' | 'client'; authorName: string | null; body: string | null; decision: 'approved' | 'changes_requested' | null; at: string }`.
- `buildThread(messages, approvals, profiles): ThreadEntry[]` (PURO) — fusiona `content_messages` y `content_approvals` del job, ordena por `at` ascendente (desempate estable por `id`), resuelve `authorName` desde `profiles`. Una approval es una entrada `kind='decision'` con su `decision` y su `comment` como `body`.
- `getThread(jobId): Promise<ThreadEntry[]>` — lee `content_messages`, `content_approvals` y `user_profiles` del job (RLS decide qué ve cada quien) y llama `buildThread`.
- `postTeamMessage(jobId, body): Promise<void>` — inserta `author_role='team', author_user_id=<sesión>`.
- `postClientMessage(jobId, body): Promise<void>` — inserta `author_role='client', author_user_id=<sesión>`.
- `subscribeThread(jobId, onChange): () => void` — Realtime sobre `content_messages` filtrado por `job_id`, y sobre `content_approvals` del job; cleanup remueve el canal.

- [ ] **Step 1: Test que falla** — `threadMapper.test.ts`: `buildThread` con mensajes + approvals mock arma el orden cronológico correcto, intercala decisiones, resuelve nombres, maneja hilo vacío y timestamps iguales (desempate por id).
- [ ] **Step 2:** Correr, ver fallar (`npm test`).
- [ ] **Step 3:** Implementar tipos + `buildThread` puro + `getThread`/`postTeamMessage`/`postClientMessage`/`subscribeThread` (con `getSupabase()`). El canal Realtime usa un nombre único por job (`thread-${jobId}`).
- [ ] **Step 4:** `npm test` verde. Commit (solo tus archivos).

---

### Task 2: Admin — hilo en la pieza (ver + responder como equipo)

**Files:**
- Create: `src/components/admin/campaigns/PieceThread.tsx`
- Modify: `src/components/admin/campaigns/PieceStatusRow.tsx`

**Interfaces:** Consume Task 1 (`getThread`, `postTeamMessage`, `subscribeThread`). Estética admin (dark).

- [ ] **Step 1:** `PieceThread` (reusable, recibe `jobId` + `mode: 'team'|'client'`): carga `getThread`, se suscribe con `subscribeThread` y limpia al desmontar; lista las `ThreadEntry` (burbuja según `authorRole`, decisiones con su color); input para escribir. En `mode='team'` postea con `postTeamMessage`.
- [ ] **Step 2:** `PieceStatusRow`: botón/acordeón "Conversación" que despliega `PieceThread mode='team'` para esa pieza. Badge con contador de mensajes sin leer del cliente si es barato (si no, omitir).
- [ ] **Step 3:** `npm run build` verde + revisar en `npm run dev`. Commit (solo tus archivos).

---

### Task 3: Portal — hilo en la pieza (ver + escribir como cliente)

**Files:**
- Modify: `src/components/portal/PiecePlayer.tsx` (o `PieceCard.tsx`, donde vive el detalle de la pieza)

**Interfaces:** Consume Task 1 (`getThread`, `postClientMessage`, `subscribeThread`) y `PieceThread` de Task 2 (reusar con `mode='client'`, estilado navy).

- [ ] **Step 1:** Integrar `PieceThread mode='client'` en el detalle de la pieza del portal, con la estética navy (puede requerir una prop de tema o clases propias; reusar la lógica, no duplicar el service). El cliente ve las respuestas del equipo y escribe las suyas; se integra con el flujo de aprobar/pedir cambios existente (`submitDecision`).
- [ ] **Step 2:** Verificar el camino bidireccional en `npm run dev`: como cliente (`monica@cardoso.test`) escribir un mensaje; en otra pestaña como equipo verlo aparecer en vivo y responder; el cliente lo recibe sin refresh.
- [ ] **Step 3:** `npm run build` verde. Commit (solo tus archivos).

---

### Task 4: Admin — preview de la campaña como la ve el cliente

**Files:**
- Create: `src/pages/admin/PortalPreview.tsx`, `src/lib/portalPreviewService.ts`
- Modify: `src/App.tsx` (ruta `/admin/portal-preview/:clientId`, bajo `AuthGuard`), `src/components/admin/campaigns/PieceStatusRow.tsx` o `CampaignGroup.tsx` (botón *Abrir en el portal*)

**Interfaces:** Lee con las policies de equipo (ve todo). Reusa los componentes visuales del portal (`CampaignHero`, `PieceRail`, `PieceCard`/`PiecePlayer`).

- [ ] **Step 1:** `portalPreviewService.ts`: `getCampaignPreview(clientId): Promise<PortalCampaign | null>` — misma forma que `getMyCampaign` pero filtrando por `client_id` explícito (lee `clients`, `content_campaigns`, `content_jobs`, `content_assets`, `content_approvals` por `client_id`; incluye TODAS las piezas, también borradores, porque es vista del equipo). Un banner debe poder indicar cuáles están en borrador.
- [ ] **Step 2:** `PortalPreview.tsx`: ruta admin que toma `:clientId`, llama `getCampaignPreview`, y renderiza la vista del portal (componentes del portal) con un **banner superior** "Vista previa del equipo — así lo ve el cliente" y marca visible/borrador por pieza. Solo lectura (sin aprobar/escribir).
- [ ] **Step 3:** `App.tsx`: agregar `<Route path="/admin/portal-preview/:clientId" element={<AuthGuard><PortalPreview/></AuthGuard>} />`. Botón *Abrir en el portal* en el admin que navega ahí (nueva pestaña).
- [ ] **Step 4:** `npm run build` verde + revisar en `npm run dev`: desde la card de Cardoso, *Abrir en el portal* muestra la campaña con el look del cliente y el banner. Commit (solo tus archivos).

---

## Notas de handoff
- **Prerrequisito:** Planes 5 y 6 aplicados/mergeados.
- **Fuera de alcance (diseño posterior):** alertas persistentes (campana/FCM/email) cuando el cliente actúa, y publicación a IG/TikTok desde el admin.
- **Deferidos conocidos:** marcador leído/no-leído real en el hilo; paginación del hilo si crece mucho (límite 1000 de Supabase).
