-- Endurecimiento de roles y RLS (auditoría 2026-11-24, incidente Materalia).
-- Idempotente. Correr completa en el SQL Editor de Supabase.
--
-- Qué cierra:
--   1. user_profiles: cualquier usuario autenticado (clientes incluidos) leía
--      emails y roles de todo el equipo y de los demás clientes.
--   2. proposals + tablas hijas: "acceso total" para cualquier autenticado.
--   3. projects: los proyectos no publicados eran visibles para cualquier autenticado.
--   4. user_fcm_tokens: los tokens push se podían leer SIN sesión.
--   5. handle_new_user: un alta sin rol nacía 'vendedor' y había casillas admin
--      de dominios que no son de CreAPP.
--
-- Paso manual aparte (no se puede hacer por SQL): Authentication > Sign In /
-- Providers > desactivar "Allow new users to sign up". Los usuarios se crean
-- solo por las Edge Functions (manage-team, invite-client).

begin;

-- 0. Helpers SECURITY DEFINER (evitan recursión de RLS sobre user_profiles).
create or replace function public.is_team()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('admin', 'vendedor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_team() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_team() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Borra TODAS las políticas de una tabla (los nombres en vivo pueden diferir
-- de los archivos del repo) para recrear el set completo y conocido.
create or replace function pg_temp.drop_all_policies(tbl text)
returns void language plpgsql as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', p.policyname, tbl);
  end loop;
end;
$$;

-- 1. user_profiles: cada uno lee su fila; el equipo lee todas.
select pg_temp.drop_all_policies('user_profiles');
alter table public.user_profiles enable row level security;

create policy "Own profile or team can read user_profiles"
  on public.user_profiles for select to authenticated
  using (id = auth.uid() or public.is_team());

create policy "Admins can update user_profiles"
  on public.user_profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete user_profiles"
  on public.user_profiles for delete to authenticated
  using (public.is_admin());

-- 2. proposals: público lee publicadas/firmadas y puede firmar; el equipo gestiona.
select pg_temp.drop_all_policies('proposals');
alter table public.proposals enable row level security;

create policy "Public can read published proposals"
  on public.proposals for select
  using (status in ('published', 'signed'));

create policy "Public can sign published proposals"
  on public.proposals for update to public
  using (status = 'published') with check (status = 'signed');

create policy "Team manages proposals"
  on public.proposals for all to authenticated
  using (public.is_team()) with check (public.is_team());

do $$
declare t text;
begin
  foreach t in array array[
    'proposal_inclusions', 'proposal_exclusions', 'proposal_milestones',
    'proposal_payments', 'proposal_project_options', 'proposal_infrastructure_costs'
  ] loop
    perform pg_temp.drop_all_policies(t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Public can read rows of published proposals" on public.%I for select
         using (proposal_id in (select id from public.proposals where status in (''published'', ''signed'')))', t);
    execute format(
      'create policy "Team manages rows" on public.%I for all to authenticated
         using (public.is_team()) with check (public.is_team())', t);
  end loop;
end;
$$;

-- 3. projects: público lee solo los activos (showroom); el equipo gestiona.
select pg_temp.drop_all_policies('projects');
alter table public.projects enable row level security;

create policy "Public can read active projects"
  on public.projects for select
  using (status = 'active');

create policy "Team manages projects"
  on public.projects for all to authenticated
  using (public.is_team()) with check (public.is_team());

-- 4. user_fcm_tokens: nadie sin sesión lee tokens.
select pg_temp.drop_all_policies('user_fcm_tokens');
alter table public.user_fcm_tokens enable row level security;

create policy "Users read own tokens"
  on public.user_fcm_tokens for select to authenticated
  using (user_id = auth.uid() or user_id is null);

create policy "Register device token"
  on public.user_fcm_tokens for insert
  with check (user_id = auth.uid() or user_id is null);

create policy "Users update own tokens"
  on public.user_fcm_tokens for update to authenticated
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

create policy "Admins manage all tokens"
  on public.user_fcm_tokens for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5. Trigger de alta: sin rol explícito nace 'client' (menor privilegio) y solo
--    quedan las casillas admin que controla CreAPP.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  parsed_name text;
begin
  if lower(new.email) in ('creapp.ar@gmail.com', 'admin@creapp.com.ar') then
    assigned_role := 'admin'::public.user_role;
  else
    assigned_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', '')::public.user_role,
      'client'::public.user_role
    );
  end if;

  parsed_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.user_profiles (id, email, role, full_name)
  values (new.id, new.email, assigned_role, parsed_name)
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

commit;
