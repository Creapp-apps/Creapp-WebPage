-- ==============================================================================
-- MIGRACIÓN: Fundación de contenido (Creador de Contenidos -> CreAPP)
-- Tablas raíz: clients, content_campaigns, content_jobs, content_assets
-- Mapeo 1:1 con el motor por `clients.slug` (storage/clients/<slug>).
-- La escritura del motor usa service_role (ignora RLS); acá solo hay lectura de equipo.
-- ==============================================================================

-- 1. Función genérica para mantener updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- 2. Clientes
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  niche text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Campañas de contenido
create table if not exists public.content_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  slug text not null,
  title text,
  month text,
  aesthetic_archetype text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, slug)
);

-- 4. Piezas (jobs) de contenido
create table if not exists public.content_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.content_campaigns(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  job_id_motor text not null unique,
  type text not null,
  title text,
  status text not null default 'sent',
  duration numeric,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Assets de cada pieza
create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  kind text not null,
  url text not null,
  r2_key text,
  width int,
  height int,
  bytes bigint,
  created_at timestamptz not null default now()
);

-- 6. Índices
create index if not exists content_campaigns_client_id_idx on public.content_campaigns (client_id);
create index if not exists content_jobs_client_id_idx on public.content_jobs (client_id);
create index if not exists content_jobs_campaign_id_idx on public.content_jobs (campaign_id);
create index if not exists content_assets_job_id_idx on public.content_assets (job_id);

-- 7. Triggers de updated_at
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute procedure public.set_updated_at();

drop trigger if exists content_campaigns_set_updated_at on public.content_campaigns;
create trigger content_campaigns_set_updated_at
  before update on public.content_campaigns
  for each row execute procedure public.set_updated_at();

drop trigger if exists content_jobs_set_updated_at on public.content_jobs;
create trigger content_jobs_set_updated_at
  before update on public.content_jobs
  for each row execute procedure public.set_updated_at();

-- 8. RLS
alter table public.clients enable row level security;
alter table public.content_campaigns enable row level security;
alter table public.content_jobs enable row level security;
alter table public.content_assets enable row level security;

-- Lectura para el equipo (admin / vendedor)
drop policy if exists "Team can read clients" on public.clients;
create policy "Team can read clients"
  on public.clients
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Team can read content_campaigns" on public.content_campaigns;
create policy "Team can read content_campaigns"
  on public.content_campaigns
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Team can read content_jobs" on public.content_jobs;
create policy "Team can read content_jobs"
  on public.content_jobs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Team can read content_assets" on public.content_assets;
create policy "Team can read content_assets"
  on public.content_assets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

-- Sin políticas para rol `client` (llega con el plan del portal).
-- Escrituras: solo service_role (puente de push del motor).
