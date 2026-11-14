-- ==============================================================================
-- MIGRACIÓN: Pipeline / CRM compartido (Leads) -> Supabase
-- Antes el Pipeline guardaba en localStorage del navegador (cada usuario veía SU
-- tablero). Esta tabla lo hace compartido entre el equipo (Seba/Facu) y en vivo.
-- Escriben admin/vendedor (RLS); Realtime habilitado para ver cambios al instante.
-- Espejo 1:1 de la interfaz `Lead` en src/lib/pipelineService.ts.
-- ==============================================================================

-- 1. Tabla
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  company          text,
  contact_name     text,
  industry         text,
  stage            text not null default 'prospect'
                     check (stage in ('no_answer','prospect','contacted','proposal_sent',
                                      'negotiation','in_production','delivered','rejected')),
  estimated_value  numeric not null default 0,
  currency         text not null default 'USD' check (currency in ('USD','ARS')),
  phone            text,
  email            text,
  website          text,
  instagram        text,
  facebook         text,
  product_type     text,
  notes            text,
  address          text,
  city             text,
  rating           numeric,
  review_count     integer,
  proposal_slug    text,
  original_prospect jsonb,
  created_by       text,
  updated_by       text,
  created_at       timestamptz not null default now(),
  last_contact_at  timestamptz,
  updated_at       timestamptz not null default now()
);

create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- 2. updated_at automático (reusa la función genérica de content_foundation)
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- 3. RLS: el equipo (admin/vendedor) lee y escribe todo (distinto del contenido,
--    que lo escribe el motor por service_role; acá escriben los usuarios).
alter table public.leads enable row level security;

drop policy if exists "Team manages leads" on public.leads;
create policy "Team manages leads"
  on public.leads
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

-- 4. Realtime (idempotente): cuando uno mueve una tarjeta, el otro la ve al instante.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
