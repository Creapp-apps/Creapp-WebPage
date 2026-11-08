# Fusión Creador→CreAPP — Plan 4: Admin "Marketing & Campañas" (tracker de aprobaciones en vivo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una sección nueva **"Marketing & Campañas"** en el sidebar del panel admin de CreAPP, donde el equipo ve **en tiempo real** el estado de cada campaña/cliente: qué piezas aprobó el cliente, cuáles pidió cambios (con su comentario), cuáles siguen sin revisar, quién y cuándo.

**Architecture:** 100% CreAPP (React admin + Supabase). Los datos ya existen y son legibles por el equipo vía RLS del Plan 2 (policies "Team can read …"). Se agrega: una sección/tab nueva, un servicio que arma el estado por cliente→campaña→pieza desde `content_*` + `content_approvals`, la UI del tracker, y **Supabase Realtime** para que el estado se actualice solo cuando el cliente aprueba/comenta. Una micro-migración habilita Realtime en las tablas de contenido.

**Tech Stack:** React 19 + TS + Vite + Tailwind (estética del admin existente), `@supabase/supabase-js` (anon + RLS + Realtime). Sin dependencias nuevas.

**Spec:** diseño `docs/superpowers/specs/2026-11-07-fusion-creador-creapp-design.md` (§4.5); decisiones del usuario 2026-11-08: mantener "Pedir cambios" como la negativa (sin "rechazar" duro); sección nueva en el sidebar "Marketing & Campañas".

## Global Constraints

- Un solo repo: CreAPP. Estética del **admin** (dark CreAPP, Tailwind como las otras tabs), NO la estética navy del portal.
- Solo lectura por parte del equipo; el equipo NO escribe en `content_approvals` (eso es del cliente). El tracker es read-only + Realtime.
- Visible para el equipo (admin **y** vendedor); NO es admin-only.
- Solo anon + RLS (nunca service_role en el front). Cero secretos.
- **git add SOLO los archivos de la task** (hay WIP del usuario en el working tree: `src/components/ui/ContactForm.tsx`, `supabase/migrations/20261026120000_generalize_leads_for_contact_form.sql`, `.temp/cli-latest` — NUNCA `git add -A`).
- Copy es-AR. No romper tabs existentes ni el routing por `?tab=`.
- Estado de pieza (derivado): `sent` = **Sin revisar**, `approved` = **Aprobada**, `changes_requested` = **Pidió cambios**. El estado vigente = última fila de `content_approvals` por job (por `created_at`), o `sent` si no hay.

## Review Focus

- **Fuga de realtime:** la suscripción Realtime respeta RLS; el equipo recibe cambios de todos los clientes (correcto), pero verificar que no se filtre nada que el equipo no deba ver y que la suscripción se limpie al desmontar (sin leaks). → Task 2/4.
- **Cliente sin campañas / sin piezas:** estado vacío elegante, no error. → Task 4.
- **Comentario largo / sin comentario:** la UI no rompe; "Pidió cambios" sin comentario muestra solo el estado. → Task 4.
- **Pieza con varias rondas de approval:** el estado y el comentario mostrados son los de la ÚLTIMA decisión (append-only). → Task 2 (test del mapper).
- **Rol vendedor:** ve la sección (no admin-only) y los datos (RLS de equipo). → Task 3.

---

### Task 1: Micro-migración — habilitar Realtime en las tablas de contenido

**Files:**
- Create: `supabase/migrations/20261108120000_content_realtime.sql`

- [ ] **Step 1: Escribir la migración** (idempotente; agregar cada tabla a la publicación `supabase_realtime` solo si no está):
```sql
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='content_jobs') then
    alter publication supabase_realtime add table public.content_jobs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='content_approvals') then
    alter publication supabase_realtime add table public.content_approvals;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='content_campaigns') then
    alter publication supabase_realtime add table public.content_campaigns;
  end if;
end $$;
```
- [ ] **Step 2: Verificar** — `select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename like 'content_%';` → 3 filas. (Aplicación diferida al usuario en el SQL Editor, como en los planes anteriores.)
- [ ] **Step 3: Commit** (`git add supabase/migrations/20261108120000_content_realtime.sql`).

---

### Task 2: Servicio del tracker (datos + mapper + realtime)

**Files:**
- Create: `src/lib/contentTrackerTypes.ts`, `src/lib/contentTrackerMapper.ts` (puro), `src/lib/contentTrackerService.ts`
- Test: `src/lib/contentTrackerMapper.test.ts`
- Modify: `package.json` solo si el glob de `npm test` no cubre el nuevo test (ya es `node --test src/lib/*.test.ts`, así que lo cubre).

**Interfaces (consume Task 4):**
- Tipos: `TrackerPieceStatus = 'sent'|'approved'|'changes_requested'`; `TrackerPiece = { id, type, title, coverUrl: string|null, status, lastComment: string|null, lastDecisionAt: string|null, lastDecisionBy: string|null }`; `TrackerCampaign = { id, title: string|null, month: string|null, pieces: TrackerPiece[] }`; `TrackerClient = { id, slug, name, logoUrl: string|null, campaigns: TrackerCampaign[], counts: { total, approved, changes, pending } }`; `TrackerOverview = { clients: TrackerClient[], totals: { clients, total, approved, changes, pending } }`.
- `mapTracker(clients, campaigns, jobs, assets, approvals, profiles): TrackerOverview` (PURO) — agrupa, deriva el estado vigente por job (última approval por created_at), arma `lastComment/lastDecisionAt/lastDecisionBy` (nombre desde `profiles` por `client_user_id`), y los counts.
- `getTrackerOverview(): Promise<TrackerOverview>` — lee bajo RLS de equipo: `clients` (raw: id,slug,name,logo_url), `content_campaigns`, `content_jobs`, `content_assets` (solo cover: kind in ('cover_9_16','slide') — la primera por job como thumb), `content_approvals`, `user_profiles` (id,full_name,email). Llama a `mapTracker`.
- `subscribeTracker(onChange: () => void): () => void` — se suscribe por Supabase Realtime a cambios en `content_approvals` y `content_jobs` (postgres_changes, event '*'), llama `onChange` ante cualquier cambio, y devuelve una función de cleanup que remueve el canal.

- [ ] **Step 1: Test que falla** — `contentTrackerMapper.test.ts` (node:test): `mapTracker` con filas mock arma `TrackerOverview` correcto — agrupa por cliente/campaña, deriva estado por última approval (incl. caso de 2 approvals: gana la más reciente), `lastComment/By` correctos, y `counts/totals` correctos (approved/changes/pending). 
- [ ] **Step 2: Correr y verificar que falla** (`npm test`).
- [ ] **Step 3: Implementar** tipos + `mapTracker` puro + `getTrackerOverview` (queries con `getSupabase()`) + `subscribeTracker` (Realtime, con cleanup). Cover thumb: por cada job, la primera `content_assets` con kind cover/slide (url).
- [ ] **Step 4: Correr tests** (verde, `npm test`).
- [ ] **Step 5: Commit** (solo tus archivos).

---

### Task 3: Sidebar + routing — sección "Marketing & Campañas"

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx` (AdminTab + NavGroup nuevo)
- Modify: `src/pages/admin/AdminPanel.tsx` (import + render del tab)

**Interfaces:** nueva `AdminTab` id `'content_campaigns'`; render de `<ContentCampaignsTab/>` (Task 4) cuando `activeTab==='content_campaigns'`.

- [ ] **Step 1** — `AdminLayout.tsx`: agregar `| 'content_campaigns'` al type `AdminTab`. En `rawNavGroups`, agregar un NavGroup nuevo `{ title: 'Marketing & Campañas', items: [{ id: 'content_campaigns', label: 'Campañas de Contenido', icon: <un ícono lucide apropiado, p.ej. Megaphone o Clapperboard> }] }`. Elegir el ícono de los ya importados o importar uno de `lucide-react`. NO marcar adminOnly (lo ve el equipo). Ubicar el grupo de forma coherente (p.ej. después de "Ventas & Crecimiento").
- [ ] **Step 2** — `AdminPanel.tsx`: `import ContentCampaignsTab from '@/components/admin/campaigns/ContentCampaignsTab';`. Agregar `{activeTab === 'content_campaigns' && <ContentCampaignsTab />}` junto a los otros renders. NO agregar a `ADMIN_ONLY_TABS` (lo ve admin y vendedor).
- [ ] **Step 3** — Verificar que compila (`npm run build`) y que el sidebar muestra la sección; que `?tab=content_campaigns` la activa. (La UX completa se valida con Task 4.)
- [ ] **Step 4: Commit** (solo tus archivos). (Nota: ContentCampaignsTab lo crea Task 4; para que compile este commit, crear un stub mínimo de ContentCampaignsTab o hacer Task 3 y 4 juntas si conviene — el implementador decide, pero el build debe quedar verde.)

---

### Task 4: UI del tracker — `ContentCampaignsTab`

**Files:**
- Create: `src/components/admin/campaigns/ContentCampaignsTab.tsx` (+ subcomponentes si ayuda: `ClientCampaignCard.tsx`, `PieceStatusRow.tsx`)

**Interfaces:** consume `contentTrackerService` (Task 2). Estética admin (dark CreAPP, Tailwind como DashboardTab/ProjectsTab).

- [ ] **Step 1** — `ContentCampaignsTab`: carga `getTrackerOverview()` (useEffect + loading/empty/error), se suscribe con `subscribeTracker(() => refetch())` y limpia al desmontar. Header con resumen (overview.totals): "N clientes · M piezas · X aprobadas · Y pidieron cambios · Z sin revisar" + un indicador sutil "en vivo".
- [ ] **Step 2** — Por cliente (card con logo real si hay / nombre): sus campañas, y por pieza una fila: thumb chica (coverUrl), título, **chip de estado** (Sin revisar / Aprobada / Pidió cambios con colores claros), y si pidió cambios/aprobó: el **comentario del cliente** (si hay) + "quién · cuándo" (lastDecisionBy + fecha relativa es-AR). Sin info técnica cruda innecesaria (no job_id_motor).
- [ ] **Step 3** — Estados borde: sin campañas → estado vacío ("Todavía no enviaste campañas a ningún cliente"); error → mensaje es-AR, no técnico. Filtro/orden opcional (por cliente, por "pendientes primero") si es barato; si no, dejar un orden sensato (clientes con pendientes/cambios arriba).
- [ ] **Step 4** — Verificar en navegador: `npm run dev`, entrar al admin como equipo, abrir "Campañas de Contenido", ver el estado de Cardoso (la pieza aprobada); abrir el portal en otra pestaña como cliente, cambiar una decisión, y ver que el tracker se actualiza solo (Realtime). Correr `npm run build` (sin errores nuevos).
- [ ] **Step 5: Commit** (solo tus archivos).

---

## Notas de handoff
- **Prerrequisito usuario:** aplicar la migración de Task 1 (Realtime) en el SQL Editor del proyecto de CreAPP.
- **Datos de prueba ya existen:** cliente `cardoso_propiedades` con 1 carrusel aprobado por `monica@cardoso.test`. Para ver movimiento en vivo: cambiar la decisión desde el portal.
- **Siguiente (no en este plan):** aviso persistente al equipo cuando el cliente actúa (campana FCM / email Resend vía trigger DB → edge function); botón "Enviar al cliente" desde el admin; invite real de clientes.
