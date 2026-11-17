-- ==============================================================================
-- MIGRACIÓN: Credenciales de portal guardadas para el equipo
--
-- Guarda la ÚLTIMA clave que el equipo generó para el usuario cliente de una
-- empresa, para poder reusarla/verificar la campaña sin tener que acordarse.
--
-- TRADEOFF ACEPTADO (decisión del usuario, 2026-11-17): la clave se guarda en
-- TEXTO PLANO. Es aceptable solo para portales de review de baja sensibilidad.
-- No refleja una clave que el cliente se haya puesto por su cuenta al activar;
-- refleja únicamente la última clave generada por el equipo con "Generar clave".
--
-- SEGURIDAD: solo el equipo (admin/vendedor) puede leer. Nadie escribe desde
-- authenticated: el único writer es la edge fn set-client-password (service_role).
-- ==============================================================================

create table if not exists public.client_portal_credentials (
  client_id uuid primary key references public.clients(id) on delete cascade,
  email text,
  password_plain text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.client_portal_credentials enable row level security;

-- Solo el equipo lee. Sin policies de insert/update/delete para authenticated:
-- las escrituras las hace service_role (edge fn), que no pasa por RLS.
drop policy if exists "Team can read portal credentials" on public.client_portal_credentials;
create policy "Team can read portal credentials"
  on public.client_portal_credentials
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );
