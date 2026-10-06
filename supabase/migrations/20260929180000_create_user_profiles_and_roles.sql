-- ==============================================================================
-- MIGRACIÓN: Sistema de Roles (Master Admin y Vendedor)
-- CreApp Innovation Hub
-- ==============================================================================

-- 1. Crear tipo ENUM de roles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'vendedor');
  end if;
end$$;

-- 2. Tabla de perfiles de usuario
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'vendedor',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.user_profiles enable row level security;

-- 3. Políticas de seguridad (RLS)
drop policy if exists "Authenticated users can read user_profiles" on public.user_profiles;
create policy "Authenticated users can read user_profiles"
  on public.user_profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can update user_profiles" on public.user_profiles;
create policy "Admins can update user_profiles"
  on public.user_profiles
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete user_profiles" on public.user_profiles;
create policy "Admins can delete user_profiles"
  on public.user_profiles
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Función y Trigger automático al crearse usuarios en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  parsed_name text;
begin
  if new.email in ('creapp.ar@gmail.com', 'creapp@creapp.com', 'admin@creapp.com.ar', 'admin@creapp.com') then
    assigned_role := 'admin'::public.user_role;
  elsif (new.raw_user_meta_data->>'role') = 'admin' then
    assigned_role := 'admin'::public.user_role;
  else
    assigned_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'vendedor'::public.user_role);
  end if;

  parsed_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.user_profiles (id, email, role, full_name)
  values (new.id, new.email, assigned_role, parsed_name)
  on conflict (id) do update
  set 
    email = excluded.email,
    role = case 
      when excluded.email in ('creapp.ar@gmail.com', 'creapp@creapp.com', 'admin@creapp.com.ar', 'admin@creapp.com') then 'admin'::public.user_role
      else public.user_profiles.role
    end,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Trigger sobre auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Poblar usuarios existentes que ya estén registrados en auth.users
insert into public.user_profiles (id, email, role, full_name)
select 
  id, 
  email, 
  case 
    when email in ('creapp@creapp.com', 'admin@creapp.com.ar', 'admin@creapp.com') then 'admin'::public.user_role
    else 'admin'::public.user_role
  end as role,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name
from auth.users
on conflict (id) do nothing;
