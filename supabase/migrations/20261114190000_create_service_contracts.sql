-- ==============================================================================
-- MIGRACIÓN: Contratos de Servicio & SLA compartidos -> Supabase
-- Antes guardaban en localStorage (cada navegador veía SUS contratos). Ahora
-- compartido entre el equipo (Seba/Facu) + Realtime. Espejo de la interfaz
-- ServiceContract en src/lib/contractService.ts. La tabla arranca vacía
-- (no se auto-seedea el contrato de AlPaso).
-- ==============================================================================

-- 1. Tabla
create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_ref text,
  client_name text not null,
  client_tax_id text,
  client_email text,
  client_phone text,
  lead_id text,
  slug text,
  product_id text,
  product_name text,
  monthly_fee text,
  setup_fee text,
  currency text default 'USD',
  sla_uptime text,
  response_time_critical text,
  support_channels text,
  effective_date text,
  duration_months text,
  status text default 'draft',
  view_count integer default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  signed_by_name text,
  signed_by_tax_id text,
  signed_by_role text,
  signature_image text,
  verification_hash text,
  custom_clauses text,
  notes text,
  activity_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists service_contracts_status_idx
  on public.service_contracts (status);
create index if not exists service_contracts_created_at_idx
  on public.service_contracts (created_at desc);

-- 2. updated_at automático (reusa la función genérica)
drop trigger if exists service_contracts_set_updated_at on public.service_contracts;
create trigger service_contracts_set_updated_at
  before update on public.service_contracts
  for each row execute function public.set_updated_at();

-- 3. RLS: el equipo (admin/vendedor) lee y escribe todo
alter table public.service_contracts enable row level security;

drop policy if exists "Team manages service_contracts" on public.service_contracts;
create policy "Team manages service_contracts"
  on public.service_contracts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

-- 4. Realtime (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_contracts'
  ) then
    alter publication supabase_realtime add table public.service_contracts;
  end if;
end $$;
