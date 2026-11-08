# Admin Campañas Ops — Plan 5: Datos + RLS + Motor (fundación) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar soporte de datos al centro de operaciones: visibilidad borrador→enviar, estado de producción, estado de campaña, y el hilo de mensajes equipo↔cliente — con RLS blindada y el motor empujando los campos nuevos.

**Architecture:** Dos repos. En **CreAPP** (Supabase) se agregan columnas a `content_jobs`, se usa `content_campaigns.status`, se crea `content_messages`, se estrechan las policies de lectura del cliente a `client_visible=true`, y se habilita Realtime en el hilo. En el **motor** (Python) la capa de push sube los campos nuevos y marca las piezas como borrador. El `service_role` sigue solo en el `.env` del motor.

**Tech Stack:** Supabase (Postgres + RLS + Realtime), Python (requests/REST con service_role). Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-08-admin-campaigns-operations-design.md`.

## Global Constraints

- `service_role` SOLO en el `.env` del motor; nunca en el front ni commiteado. El front usa anon + RLS.
- Migraciones las aplica el usuario en el SQL Editor (proyecto `yjrqpjlzyxivwpfcatvt`); idempotentes (`if not exists` / `drop policy if exists`).
- `git add` SOLO archivos propios de la task. Hay WIP del usuario en el working tree de CreAPP (`src/components/ui/ContactForm.tsx`, `src/lib/geminiService.ts`, `src/lib/telemetryService.ts`, `src/lib/aiClient.ts`, `api/gemini.js`, `vite.config.ts`, `.gitignore`, `supabase/.temp/cli-latest`, `supabase/migrations/20261026120000_generalize_leads_for_contact_form.sql`) — NUNCA `git add -A`.
- Copy es-AR. No romper el tracker del Plan 4 ni el portal.
- Valores textuales fijos: `content_jobs.production_stage ∈ {guion,voz,broll,render,qa,listo,borrador,enviado}`; `content_campaigns.status ∈ {active,closed}` (hoy default `'draft'` — se migra a `'active'`); `content_messages.author_role ∈ {team,client}`.
- Backfill: las filas existentes de `content_jobs` pasan a `client_visible=true`, `sent_at=created_at` (no ocultar lo que el cliente ya ve).

## Review Focus

- **Fuga de borrador por fila:** un cliente NO puede leer un `content_jobs` con `client_visible=false`. → Task 2 (test RLS).
- **Fuga de borrador por asset:** un cliente NO puede leer un `content_assets` cuyo job está en borrador (la policy de assets hace su propio join y debe chequear `client_visible`). → Task 2 (test RLS).
- **Suplantación en el hilo:** un cliente no puede insertar `author_role='team'` ni en un job de otro cliente; el equipo no puede insertar `author_role='client'`. → Task 3 (test RLS con check).
- **Re-push pisa envío:** un re-push del motor sobre una pieza ya enviada NO vuelve a ponerla en borrador (`client_visible` no se pisa; `sent_at` se preserva). → Task 4 (test del push).
- **Campos del motor escritos por el equipo:** el equipo (anon+RLS) solo puede UPDATE de `client_visible/sent_at` (jobs) y `status` (campaigns); nunca `production_stage/rendered/job_id_motor`. → Task 3 (test RLS update column-restricted).

---

### Task 1: Migración — columnas de visibilidad y producción en content_jobs

**Files:**
- Create: `supabase/migrations/20261108130000_content_ops_columns.sql`

**Interfaces (produce para Tasks 2-6):**
- `content_jobs.client_visible boolean not null default false`
- `content_jobs.sent_at timestamptz`
- `content_jobs.production_stage text` (sin constraint duro; valores del Global Constraints)
- `content_jobs.rendered boolean not null default false`
- `content_campaigns.status` migrado: filas `'draft'` → `'active'`.

- [ ] **Step 1:** Escribir la migración idempotente: `alter table ... add column if not exists` para las 4 columnas de `content_jobs`. Backfill en el mismo archivo: `update public.content_jobs set client_visible = true, sent_at = coalesce(sent_at, created_at) where client_visible = false;` (corre una vez; en re-ejecución no re-oculta nada porque ya están en true). Y `update public.content_campaigns set status = 'active' where status = 'draft';`.
- [ ] **Step 2: Verificar** — `select column_name from information_schema.columns where table_name='content_jobs' and column_name in ('client_visible','sent_at','production_stage','rendered');` → 4 filas. (Aplicación diferida al usuario.)
- [ ] **Step 3: Commit** (solo este archivo).

---

### Task 2: Migración — estrechar lectura del cliente a client_visible=true

**Files:**
- Create: `supabase/migrations/20261108140000_content_visibility_rls.sql`
- Test: `supabase/tests/rls_draft_visibility_test.sql`

**Interfaces:** Consume Task 1 (`client_visible`). Reescribe 2 policies existentes de `20261107140000_client_access.sql`: "Members can read own content_jobs" y "Members can read own content_assets".

- [ ] **Step 1: Escribir el test que falla** (`rls_draft_visibility_test.sql`, estilo del test existente `supabase/tests/rls_client_access_test.sql`): como un usuario miembro de un cliente, con un job `client_visible=false` sembrado, `select` sobre `content_jobs` NO devuelve ese job, y `select` sobre sus `content_assets` NO devuelve sus assets; con `client_visible=true` SÍ los devuelve. El equipo ve ambos casos.
- [ ] **Step 2:** Escribir la migración: `drop policy if exists "Members can read own content_jobs" on public.content_jobs;` + recrearla con `using (public.is_member_of(client_id) and client_visible = true)`. Ídem "Members can read own content_assets": el `using` que hace join a `content_jobs j` suma `and j.client_visible = true`. Las policies del equipo NO se tocan (el equipo sigue viendo todo).
- [ ] **Step 3: Verificar** — correr el test SQL; pasa. (Aplicación diferida al usuario.)
- [ ] **Step 4: Commit** (solo tus archivos).

---

### Task 3: Migración — content_messages (hilo) + UPDATE policies del equipo

**Files:**
- Create: `supabase/migrations/20261108150000_content_messages.sql`
- Test: `supabase/tests/rls_content_messages_test.sql`

**Interfaces (produce para Task 6 y Planes 6-7):**
- Tabla `public.content_messages (id uuid pk default gen_random_uuid(), job_id uuid not null references content_jobs(id) on delete cascade, author_role text not null check (author_role in ('team','client')), author_user_id uuid not null references public.user_profiles(id), body text not null, created_at timestamptz not null default now())` + índice por `job_id`.
- Policies nuevas (detalladas abajo).

- [ ] **Step 1: Escribir el test que falla** (`rls_content_messages_test.sql`): (a) un miembro del cliente puede insertar un mensaje `author_role='client', author_user_id = auth.uid()` en un job de SU cliente y leerlo; (b) NO puede insertar `author_role='team'`; (c) NO puede insertar en un job de OTRO cliente; (d) el equipo puede insertar `author_role='team'` en cualquier job y leer todo; (e) UPDATE: un usuario del equipo puede `update content_jobs set client_visible=true` pero NO `update content_jobs set production_stage='x'` (column-restricted), y puede `update content_campaigns set status='closed'`.
- [ ] **Step 2:** Escribir la migración:
  - Crear la tabla + índice; `enable row level security`.
  - Lectura: "Team can read content_messages" (using: rol admin/vendedor, igual patrón que las otras policies de equipo); "Members can read own content_messages" (using: `exists (select 1 from content_jobs j where j.id = job_id and public.is_member_of(j.client_id))`).
  - Insert cliente: "Members can insert own content_messages" (with check: `author_role='client' and author_user_id = auth.uid() and exists (... is_member_of(j.client_id))`).
  - Insert equipo: "Team can insert content_messages" (with check: rol admin/vendedor `and author_role='team' and author_user_id = auth.uid()`).
  - **UPDATE equipo column-restricted** sobre `content_jobs`: "Team can update job visibility" (using: rol admin/vendedor; with check: rol admin/vendedor). Como RLS no restringe columnas por sí solo, agregar un **trigger `before update`** sobre `content_jobs` que, cuando el actor NO es `service_role` (p.ej. `current_setting('request.jwt.claims')` indica un usuario), **rechace** cambios en `job_id_motor/production_stage/rendered/type/campaign_id` (solo deja pasar `client_visible/sent_at/status/updated_at`). Documentar en comentario.
  - **UPDATE equipo** sobre `content_campaigns`: "Team can update campaign status" (using/with check: rol admin/vendedor), con trigger análogo que solo permita cambiar `status` (y `updated_at`).
  - Grants: `grant select, insert on public.content_messages to authenticated;` `grant update (client_visible, sent_at) on public.content_jobs to authenticated;` `grant update (status) on public.content_campaigns to authenticated;` (grant de columnas refuerza el trigger).
- [ ] **Step 3: Verificar** — correr el test SQL; pasa. (Aplicación diferida al usuario.)
- [ ] **Step 4: Commit** (solo tus archivos).

---

### Task 4: Micro-migración — Realtime en content_messages

**Files:**
- Create: `supabase/migrations/20261108160000_messages_realtime.sql`

- [ ] **Step 1:** Escribir la migración idempotente (mismo patrón que `20261108120000_content_realtime.sql`): agregar `public.content_messages` a la publicación `supabase_realtime` solo si no está.
- [ ] **Step 2: Verificar** — `select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='content_messages';` → 1 fila. (Aplicación diferida.)
- [ ] **Step 3: Commit** (solo este archivo).

---

### Task 5: Motor — supabase_sync sube los campos nuevos

**Files:**
- Modify: `/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos/src/integrations/supabase_sync.py`

**Interfaces:** Consume Task 1 (columnas). Produce para Task 6: `upsert_job(...)` acepta `client_visible`, `production_stage`, `rendered`.

- [ ] **Step 1:** Extender `upsert_job` (y el payload PATCH/POST a `content_jobs`) para incluir `production_stage` y `rendered`. **No** incluir `client_visible` en el update cuando el job ya existe (para no pisar un envío); solo setearlo en el insert inicial (`client_visible=false`). Si el REST upsert no distingue insert de update, hacer: primero `GET` por `job_id_motor`; si existe, PATCH sin `client_visible/sent_at`; si no, POST con `client_visible=false`.
- [ ] **Step 2:** Verificación manual/ligera (no hay suite Python de integración acá): un pequeño test o un `python -c` que arme el payload y verifique que el update-path no contiene la clave `client_visible`. Documentar el comando en el commit.
- [ ] **Step 3: Commit** (solo tus archivos, en el repo del motor).

---

### Task 6: Motor — portal_push calcula etapa/render y marca borrador

**Files:**
- Modify: `/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos/src/integrations/portal_push.py`

**Interfaces:** Consume Task 5 (`upsert_job` extendido). 

- [ ] **Step 1:** Agregar un helper `_production_state(job_id) -> tuple[str, bool]` que lea `storage/jobs/<id>/job_state.json` (y/o la presencia de artefactos) y devuelva `(production_stage, rendered)`: para reels con pipeline, la última etapa alcanzada mapeada a `{guion,voz,broll,render,qa,listo}`; para films/carruseles hand-authored (sin pipeline), devolver `('listo', True)` si hay asset final (mp4/slides), si no `('borrador', False)`. `rendered = tiene asset final`.
- [ ] **Step 2:** En `push_job_to_portal`, pasar `production_stage` y `rendered` a `upsert_job`. Mantener la semántica borrador (el insert nuevo entra `client_visible=false` vía Task 5; el re-push no lo pisa).
- [ ] **Step 3: Verificar** — pushear un job de prueba y confirmar en Supabase (SQL Editor o la UI) que la fila tiene `production_stage`, `rendered` y `client_visible=false` en el primer push; re-pushear y confirmar que `client_visible` no cambió. Registrar el resultado en el commit.
- [ ] **Step 4: Commit** (solo tus archivos, repo del motor).

---

## Notas de handoff
- **Prerrequisito usuario:** aplicar las migraciones de Tasks 1-4 en el SQL Editor, en orden.
- **Planes siguientes:** Plan 6 (admin: estructura + producción + enviar/despublicar + links); Plan 7 (hilo bidireccional admin+portal + realtime del hilo).
