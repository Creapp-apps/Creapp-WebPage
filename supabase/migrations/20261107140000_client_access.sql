-- ==============================================================================
-- MIGRACIÓN: Acceso de cliente al portal (Plan 2 de la fusión Creador -> CreAPP)
-- Agrega: rol 'client', client_members, content_approvals, helper is_member_of
-- y policies de lectura/aprobación por membresía. Las policies de equipo del
-- Plan 1 NO se tocan; las de cliente son policies adicionales (se suman con OR).
-- ==============================================================================

-- 1. Rol nuevo. OJO: el valor 'client' no se puede usar como literal casteado
--    en esta misma transacción; solo aparece dentro de cuerpos evaluados en runtime.
alter type public.user_role add value if not exists 'client';

-- 2. Membresía cliente <-> usuario
create table if not exists public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

-- 3. Aprobaciones del cliente sobre cada pieza (append-only)
create table if not exists public.content_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  client_user_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved', 'changes_requested')),
  comment text,
  created_at timestamptz not null default now()
);

-- 4. Índices
create index if not exists client_members_user_id_idx on public.client_members (user_id);
create index if not exists content_approvals_job_id_idx on public.content_approvals (job_id);

-- 5. Helper: ¿el usuario actual es miembro de este cliente?
--    security definer + search_path vacío: evita recursión de RLS sobre client_members.
create or replace function public.is_member_of(p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_members m
    where m.client_id = p_client_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_member_of(uuid) from public;
grant execute on function public.is_member_of(uuid) to authenticated, service_role;

-- 6. RLS
alter table public.client_members enable row level security;
alter table public.content_approvals enable row level security;

-- 6.1 client_members: cada usuario lee las suyas; el equipo lee todas.
--     Sin insert/update/delete para authenticated (lo maneja service_role).
drop policy if exists "Users can read own memberships" on public.client_members;
create policy "Users can read own memberships"
  on public.client_members
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Team can read client_members" on public.client_members;
create policy "Team can read client_members"
  on public.client_members
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

-- 6.2 Lectura de cliente sobre las tablas de contenido (adicionales a las de equipo)
drop policy if exists "Members can read own client" on public.clients;
create policy "Members can read own client"
  on public.clients
  for select
  to authenticated
  using (public.is_member_of(id));

drop policy if exists "Members can read own content_campaigns" on public.content_campaigns;
create policy "Members can read own content_campaigns"
  on public.content_campaigns
  for select
  to authenticated
  using (public.is_member_of(client_id));

drop policy if exists "Members can read own content_jobs" on public.content_jobs;
create policy "Members can read own content_jobs"
  on public.content_jobs
  for select
  to authenticated
  using (public.is_member_of(client_id));

drop policy if exists "Members can read own content_assets" on public.content_assets;
create policy "Members can read own content_assets"
  on public.content_assets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.id = content_assets.job_id
        and public.is_member_of(j.client_id)
    )
  );

-- 6.3 content_approvals: lectura equipo + cliente; insert solo del propio cliente.
--     Sin update/delete: el historial de aprobaciones es inmutable.
drop policy if exists "Team can read content_approvals" on public.content_approvals;
create policy "Team can read content_approvals"
  on public.content_approvals
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Members can read own content_approvals" on public.content_approvals;
create policy "Members can read own content_approvals"
  on public.content_approvals
  for select
  to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.id = content_approvals.job_id
        and public.is_member_of(j.client_id)
    )
  );

drop policy if exists "Members can insert own content_approvals" on public.content_approvals;
create policy "Members can insert own content_approvals"
  on public.content_approvals
  for insert
  to authenticated
  with check (
    client_user_id = auth.uid()
    and exists (
      select 1 from public.content_jobs j
      where j.id = content_approvals.job_id
        and public.is_member_of(j.client_id)
    )
  );
