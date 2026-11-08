# Fusión Creador→CreAPP — Plan 2: Acceso de Cliente (rol + membresía + approvals + RLS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario con rol `client` entre al mismo Supabase de CreAPP y vea **solo** el contenido de su(s) cliente(s), y pueda registrar una decisión (aprobar / pedir cambios) por pieza — todo gobernado por RLS, sin que ningún cliente vea lo de otro ni lo del equipo quede expuesto.

**Architecture:** Capa de datos del portal, 100% en Supabase (PostgreSQL + RLS). Se agrega el valor `client` al enum de roles, una tabla puente `client_members` (varios usuarios por cliente), la tabla `content_approvals` (append-only, una fila por decisión), y políticas RLS de lectura de cliente (por membresía) sobre las tablas de contenido del Plan 1, más políticas de approvals. La UI del portal (React) es el Plan 3; este plan deja la base de datos lista y verificada.

**Tech Stack:** Supabase / PostgreSQL (migraciones SQL en `supabase/migrations/`), RLS, `auth.uid()`.

**Spec:** `docs/superpowers/specs/2026-11-07-fusion-creador-creapp-design.md` (§4.2, §4.3, §4.5).

## Global Constraints

- **Un solo repo:** CreAPP (`/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub`). Solo migraciones SQL; sin código React (eso es Plan 3).
- **Aislamiento de cliente es la propiedad crítica de seguridad:** un usuario `client` NUNCA ve filas de otro cliente, ni las tablas de contenido ni approvals. El equipo (`admin`/`vendedor`) ve todo.
- **Un usuario `client` jamás debe recibir rol de equipo.** Las políticas de equipo exigen `role in ('admin','vendedor')`, que excluye `client`. El invite (Plan 3) debe setear `raw_user_meta_data.role='client'`; el trigger `handle_new_user` ya castea ese metadato (`coalesce((raw_user_meta_data->>'role')::public.user_role, 'vendedor')`), así que con el metadato correcto el cliente queda `client`. (Riesgo documentado para Plan 3: invitar sin ese metadato deja al usuario como `vendedor` = equipo.)
- **Gotcha enum `ADD VALUE`:** `alter type ... add value` agrega `'client'` al enum `public.user_role`. El valor nuevo no puede usarse como literal casteado en el MISMO statement/transacción de la migración; por eso `'client'` solo aparece dentro de cuerpos de función/policy (evaluados en tiempo de ejecución, no al aplicar la migración), nunca como `insert ... 'client'::user_role` en la propia migración. Usar `add value if not exists`.
- **Escrituras de contenido** siguen siendo del motor vía `service_role` (ignora RLS). Este plan NO da a `client` ningún insert/update/delete sobre `clients`/`content_*` salvo insertar su propia fila en `content_approvals`.
- Copy/comentarios en es-AR.
- Nombres de tabla/columna del Plan 1 (ya en `main`): `clients(id,slug,name,niche,...)`, `content_campaigns`, `content_jobs(id,client_id,campaign_id,job_id_motor,type,status,...)`, `content_assets(id,job_id,kind,url,...)`. El enum de roles existente es `public.user_role` = `('admin','vendedor')`; `public.user_profiles(id uuid references auth.users, role public.user_role, ...)`.

## Review Focus

- **Fuga entre clientes:** un usuario `client` de la empresa A consulta `content_jobs`/`content_assets`/`content_approvals` y recibe filas de la empresa B. → test en Task 2 (simular JWT de A, assert 0 filas de B).
- **Assets sin `client_id` directo:** `content_assets` no tiene `client_id`; su RLS de cliente debe resolverse por join a `content_jobs`. Un cliente no debe ver assets de un job ajeno. → test en Task 2.
- **Approval cruzado:** un usuario `client` de A intenta insertar un `content_approvals` sobre un job de B → debe ser rechazado por RLS (`with check`). → test en Task 2.
- **Cliente escala a equipo:** un usuario `client` NO debe pasar ninguna policy de equipo ni poder escribir en `clients`/`content_*`. → test en Task 2 (assert que un insert en content_jobs como client falla).
- **Migración aplica limpia:** el `add value` del enum y las policies aplican sin error de transacción. → Task 1 Step de verificación.

---

### Task 1: Migración — rol `client`, `client_members`, `content_approvals`, RLS de cliente

**Files:**
- Create: `supabase/migrations/20261107140000_client_access.sql`

**Interfaces (contrato que consume Plan 3):**
- Enum `public.user_role` gana el valor `'client'`.
- `public.client_members(id uuid pk, client_id uuid fk→clients on delete cascade, user_id uuid fk→auth.users on delete cascade, role text not null default 'viewer' check (role in ('owner','viewer')), created_at timestamptz, unique(client_id, user_id))`.
- `public.content_approvals(id uuid pk, job_id uuid fk→content_jobs on delete cascade, client_user_id uuid not null references auth.users(id), decision text not null check (decision in ('approved','changes_requested')), comment text, created_at timestamptz default now())`, índice en `(job_id)`.
- Helper SQL `public.is_member_of(p_client_id uuid) returns boolean` (security definer, stable): true si `auth.uid()` tiene fila en `client_members` para ese `client_id`. Se usa en las policies de cliente.

- [ ] **Step 1: Escribir la migración**

Contenido, en este orden (estilo del repo: `do $$`/`create table if not exists`/`drop policy if exists`):
1. `alter type public.user_role add value if not exists 'client';`
2. `client_members` y `content_approvals` con los campos del bloque Interfaces + índices (`client_members(user_id)`, `content_approvals(job_id)`).
3. Helper `is_member_of(p_client_id uuid)`: `security definer`, `set search_path = ''`, `stable`, cuerpo `select exists(select 1 from public.client_members m where m.client_id = p_client_id and m.user_id = auth.uid())`.
4. RLS `enable` en `client_members` y `content_approvals`.
5. Policies:
   - `client_members`: el usuario lee sus propias membresías (`using (user_id = auth.uid())`); el equipo lee todas (`role in ('admin','vendedor')` vía `user_profiles`). Sin insert/update/delete para `authenticated` (lo gestiona service_role / Plan 3 admin).
   - Lectura de cliente (nuevas policies `for select to authenticated`, además de las de equipo que ya existen del Plan 1):
     - `clients`: `using (public.is_member_of(id))`.
     - `content_campaigns`: `using (public.is_member_of(client_id))`.
     - `content_jobs`: `using (public.is_member_of(client_id))`.
     - `content_assets`: `using (exists (select 1 from public.content_jobs j where j.id = content_assets.job_id and public.is_member_of(j.client_id)))`.
   - `content_approvals`:
     - select: equipo (todas) + cliente (`using (exists (select 1 from public.content_jobs j where j.id = content_approvals.job_id and public.is_member_of(j.client_id)))`).
     - insert: `to authenticated with check (client_user_id = auth.uid() and exists (select 1 from public.content_jobs j where j.id = content_approvals.job_id and public.is_member_of(j.client_id)))`. Sin update/delete (append-only).

- [ ] **Step 2: Aplicar y verificar que aplica limpio**

Run: en la DB de Supabase de CreAPP (SQL Editor del proyecto `yjrqpjlzyxivwpfcatvt`, o `supabase db push` si está linkeado).
Expected: aplica sin error (en especial el `add value` del enum y las policies).
Query de control: `select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='user_role';` → incluye `client`. `select tablename from pg_tables where tablename in ('client_members','content_approvals');` → 2 filas.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261107140000_client_access.sql
git commit -m "feat(content): acceso de cliente — rol client, client_members, content_approvals + RLS por membresía"
```

---

### Task 2: Verificación de RLS por simulación (SQL autochequeable)

**Files:**
- Create: `supabase/tests/rls_client_access_test.sql` (script de verificación, no es migración)

**Interfaces:** consume el schema de Task 1.

- [ ] **Step 1: Escribir el test SQL autochequeable**

Un script que, dentro de una transacción que al final hace `rollback`, siembra datos mínimos y simula usuarios con `set local role authenticated` + `set local request.jwt.claims = json_build_object('sub', <uuid>)::text`, y usa `assert`/`do $$ ... raise exception` para fallar si algo no se cumple. Casos (los del Review Focus):
1. Sembrar: 2 clientes (A, B) en `clients`; un `content_campaigns`+`content_jobs`+`content_assets` para cada uno; 2 usuarios en `auth.users` (uA, uB); `client_members` (uA→A, uB→B).
   - **Seed de `auth.users` (ojo FK + trigger):** `client_members.user_id` y `content_approvals.client_user_id` tienen FK a `auth.users`, así que los uuids de prueba deben existir ahí. Insertá uA/uB en `auth.users` con `raw_user_meta_data = '{"role":"client"}'::jsonb` (y los campos NOT NULL mínimos: `id`, `email`, `instance_id` = `'00000000-0000-0000-0000-000000000000'`, `aud='authenticated'`, `role='authenticated'`). El trigger `handle_new_user` creará su `user_profiles` con role `client` automáticamente (gracias al metadato). Si algún NOT NULL de `auth.users` molesta, alternativa: insertá uA/uB con lo mínimo y luego `update public.user_profiles set role='client' where id in (uA,uB)`. No dupliques `user_profiles` a mano si el trigger ya lo creó.
2. Como uA (`set local request.jwt.claims`): `select count(*) from content_jobs` = 1 (solo A); `select count(*) from content_jobs where client_id = <B>` = 0; `content_assets` visibles = solo las del job de A.
3. Como uA: `insert into content_approvals(job_id, client_user_id, decision)` sobre el job de A con `client_user_id=uA` → OK. El mismo insert sobre el job de **B** → debe fallar (capturar la excepción y afirmar que falló).
4. Como uA: `insert into content_jobs(...)` → debe fallar (cliente no escribe contenido).
5. Como un uuid sin membresía: `select count(*) from content_jobs` = 0.
6. `rollback` al final (no deja datos).

Cada aserción que no se cumpla hace `raise exception 'FALLO: <caso>'`. Si el script corre sin excepción, RLS está bien.

- [ ] **Step 2: Correr el test en la DB**

Run: pegar `supabase/tests/rls_client_access_test.sql` en el SQL Editor del proyecto (o `psql` con la connection string) y ejecutar.
Expected: termina sin error (todas las aserciones pasan) y hace `rollback` (no persiste datos de prueba).
Si alguna aserción falla, es un bug de RLS → vuelve al fix loop de Task 1.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/rls_client_access_test.sql
git commit -m "test(content): verificación RLS de acceso de cliente (aislamiento + approvals)"
```

---

## Notas de handoff
- **Prerrequisito operacional (usuario):** aplicar ambos archivos a la DB de CreAPP vía SQL Editor (Task 1 Step 2 y Task 2 Step 2), igual que en Plan 1.
- **Plan 3 (siguiente):** portal de cliente en React — login, listado/historial por cliente (lee `content_jobs`+`content_assets` bajo RLS), player MP4 desde R2, botón aprobar / pedir cambios (inserta en `content_approvals`), e invite de usuarios cliente (debe setear `raw_user_meta_data.role='client'` + crear `client_members`). El aviso al equipo (FCM/Resend) y el botón "Enviar al cliente" (Plan 4) cuelgan de acá.
- **Riesgo a vigilar en Plan 3:** el invite debe setear rol `client` en el metadato; sin eso el trigger lo deja `vendedor` (equipo) y vería todo.
