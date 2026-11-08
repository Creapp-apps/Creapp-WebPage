# Admin Campañas Ops — Plan 6: Admin estructura + producción + acciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que "Campañas de Contenido" deje de ser un visor plano: agrupar por campaña con estado vigente/cerrada y progreso, mostrar el estado de producción de cada pieza, y operar desde el admin (enviar/despublicar al cliente, cerrar/reabrir campaña, abrir en el Estudio del motor).

**Architecture:** 100% CreAPP (React admin + Supabase anon+RLS). Extiende el tracker del Plan 4 (`contentTracker*`) con los campos que el Plan 5 agregó. Las acciones escriben vía las UPDATE policies column-restricted del Plan 5. Sin dependencias nuevas.

**Tech Stack:** React 19 + TS + Vite + Tailwind (estética admin), `@supabase/supabase-js` (anon + RLS + Realtime).

**Spec:** `docs/superpowers/specs/2026-11-08-admin-campaigns-operations-design.md`. **Depende de:** Plan 5 (columnas `client_visible/sent_at/production_stage/rendered`, `campaigns.status`, UPDATE policies).

## Global Constraints

- Estética admin (dark), NO la navy del portal. Solo anon + RLS; cero `service_role` en el front.
- `git add` SOLO archivos propios; hay WIP del usuario en el working tree (ver Plan 5). NUNCA `git add -A`.
- Copy es-AR. No romper el routing `?tab=content_campaigns` ni el tracker existente. Reusar/extender `contentTrackerMapper`/`contentTrackerView` (puros, testeables), NO duplicar.
- Logos reales (`clients.logo_url`) o nombre en serif; nunca monograma genérico.
- Estado de pieza (derivado): `approved` si la última `content_approvals` es posterior a `sent_at`; si `sent_at` es posterior a la última approval (nueva versión) → `sent` (sin revisar); `changes_requested` si la última approval lo dice y no hubo re-envío posterior. Borrador (`client_visible=false`) es un estado aparte, visible solo para el equipo.
- `production_stage ∈ {guion,voz,broll,render,qa,listo,borrador,enviado}`; `campaigns.status ∈ {active,closed}`.

## Review Focus

- **Campaña sin piezas / pieza sin campaña:** estado vacío elegante, no error ni card rota. → Task 2/4.
- **Pieza en borrador vs enviada:** el equipo distingue las dos; el contador separa borradores de "sin revisar". → Task 2 (mapper test).
- **Nueva versión:** una pieza con `sent_at` posterior a su última approval cuenta como "sin revisar", no "aprobada". → Task 2 (mapper test).
- **Acción sobre pieza de otro estado:** "Enviar" solo aparece en borrador; "Despublicar" solo en enviada; no romper si el estado cambió por Realtime entre render y click. → Task 4.
- **Cerrar campaña vigente con pendientes:** se permite pero avisa; reabrir la vuelve a `active`. → Task 4.

---

### Task 1: Tipos + service — campos y acciones nuevas

**Files:**
- Modify: `src/lib/contentTrackerTypes.ts`, `src/lib/contentTrackerService.ts`

**Interfaces (produce para Tasks 2-4):**
- `TrackerPiece` suma: `clientVisible: boolean`, `sentAt: string | null`, `productionStage: string | null`, `rendered: boolean`, `jobIdMotor: string`.
- `TrackerCampaign` suma: `slug: string`, `status: 'active' | 'closed'`.
- `TrackerCounts` suma: `drafts: number`.
- `getTrackerOverview` lee las columnas nuevas (`content_jobs`: `client_visible, sent_at, production_stage, rendered, job_id_motor`; `content_campaigns`: `slug, status`).
- Nuevas funciones (anon, vía RLS UPDATE del Plan 5): `sendPiece(jobId: string): Promise<void>` (set `client_visible=true, sent_at=now()`); `unpublishPiece(jobId: string): Promise<void>` (set `client_visible=false`); `setCampaignStatus(campaignId: string, status: 'active'|'closed'): Promise<void>`.

- [ ] **Step 1:** Extender los tipos (arriba). 
- [ ] **Step 2:** Extender `getTrackerOverview` con las columnas nuevas en los `select`.
- [ ] **Step 3:** Agregar `sendPiece`/`unpublishPiece`/`setCampaignStatus` con `sb.from(...).update(...).eq('id', ...)`. Devuelven void; lanzan si hay error de Supabase.
- [ ] **Step 4:** `npm run build` verde. Commit (solo tus archivos).

---

### Task 2: Mapper + view — progreso, borradores, nueva versión, orden

**Files:**
- Modify: `src/lib/contentTrackerMapper.ts`, `src/lib/contentTrackerView.ts`
- Test: `src/lib/contentTrackerMapper.test.ts` (extender), `src/lib/contentTrackerView.test.ts` (extender)

**Interfaces:** Consume Task 1. Produce helpers puros para Task 4.

- [ ] **Step 1: Tests que fallan** — `mapTracker`: (a) una pieza con `client_visible=false` cae en `counts.drafts` y NO en pending/approved; (b) una pieza con `sent_at` posterior a su última approval se mapea `status='sent'` (sin revisar) aunque la approval diga approved; (c) `TrackerCampaign` lleva `slug` y `status`. En `contentTrackerView.ts`: (d) `campaignProgress(campaign) -> { approved, total }` cuenta solo piezas enviadas (no borradores); (e) `needsAttention(piece)` true si la última acción es del cliente `changes_requested` sin re-envío posterior; (f) orden de clientes/campañas: los que tienen piezas en atención primero.
- [ ] **Step 2:** Correr, ver fallar (`npm test`).
- [ ] **Step 3:** Implementar: en el mapper, derivar `status` comparando `sent_at` vs `max(approvals.created_at)`; contar `drafts`. En la view, `campaignProgress`, `needsAttention`, y un comparador de orden.
- [ ] **Step 4:** `npm test` verde. Commit (solo tus archivos).

---

### Task 3: UI — card de campaña con estado y progreso

**Files:**
- Modify: `src/components/admin/campaigns/ClientCampaignCard.tsx`
- Create: `src/components/admin/campaigns/CampaignGroup.tsx` (una campaña: header con mes, chip vigente/cerrada, progreso X/Y, y sus piezas)

**Interfaces:** Consume Task 1/2. `CampaignGroup` recibe una `TrackerCampaign` + callbacks de acción (de Task 4).

- [ ] **Step 1:** `CampaignGroup`: header con `title || slug` + `month`, chip **Vigente/Cerrada** (color), progreso `X/Y aprobadas` (de `campaignProgress`), contadores (aprobadas · pidieron cambios · sin revisar · en borrador). Colapsable; expandido muestra las `PieceStatusRow`.
- [ ] **Step 2:** `ClientCampaignCard`: renderizar un `CampaignGroup` por campaña del cliente (en vez de aplanar las piezas). Mantener el logo real / nombre serif y el chip de estado del cliente.
- [ ] **Step 3:** `npm run build` verde + revisar en `npm run dev` (ya corre en :3002) que Cardoso muestra su campaña agrupada. Commit (solo tus archivos).

---

### Task 4: UI — badges de producción, acciones y filtros

**Files:**
- Modify: `src/components/admin/campaigns/PieceStatusRow.tsx`, `src/components/admin/campaigns/ContentCampaignsTab.tsx`
- Create: `src/lib/motorStudio.ts` (helper del link al Estudio)

**Interfaces:** Consume Task 1 (`sendPiece/unpublishPiece/setCampaignStatus`, `jobIdMotor`) y Task 2 (`needsAttention`, orden).

- [ ] **Step 1:** `PieceStatusRow`: sumar **badge de producción** (etapa + `rendered` sí/no) y **badge borrador/enviada**. Acciones por pieza: *Enviar al cliente* (solo si `clientVisible=false`) → `sendPiece`; *Despublicar* (solo si enviada) → `unpublishPiece`; *Abrir en Estudio* → `motorStudio(jobIdMotor)` (abre en nueva pestaña). Tras la acción, refetch (el Realtime del Plan 4 ya actualiza, pero disparar refetch inmediato para feedback).
- [ ] **Step 2:** `motorStudio.ts`: `export function motorStudio(jobIdMotor: string): string` → URL del Estudio del motor. Usar una constante configurable `const MOTOR_BASE = 'http://localhost:8000'` y construir `${MOTOR_BASE}/?job=${encodeURIComponent(jobIdMotor)}`. **Builder:** confirmar la ruta real del Estudio en el repo del motor (`src/web`) y ajustar el path.
- [ ] **Step 3:** `ContentCampaignsTab`: aplicar el orden "atención primero" (Task 2), un filtro simple (toggle "solo con pendientes/atención") y un buscador de cliente por nombre. Acción de campaña: *Cerrar/Reabrir* (`setCampaignStatus`) en el header del `CampaignGroup`; al cerrar con piezas pendientes, confirmar con un aviso es-AR (no bloquear).
- [ ] **Step 4:** `npm run build` verde + revisar en `npm run dev`: enviar/despublicar una pieza de borrador, cerrar/reabrir una campaña, abrir el link del Estudio. Commit (solo tus archivos).

---

## Notas de handoff
- **Prerrequisito:** Plan 5 aplicado (migraciones + motor empujando los campos).
- **Datos de prueba:** la pieza de Cardoso (Carrusel aprobado). Para ver borradores: pushear una pieza nueva desde el motor (entra `client_visible=false`) y probar *Enviar al cliente*.
- **Siguiente:** Plan 7 — hilo bidireccional (admin + portal) + preview del equipo + realtime del hilo.
