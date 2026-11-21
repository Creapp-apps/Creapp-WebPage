-- Lanzamientos (centro de control): tablas de salud del cron/deploys,
-- permalink en scheduled_posts y trigger de updated_at.
-- Idempotente. scheduled_posts.status es text (incluye 'cancelled'); sin enums.

-- 1) Tablas de salud --------------------------------------------------------
create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  cron_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text,
  processed_count int not null default 0,
  published_count int not null default 0,
  error_count int not null default 0,
  error_text text,
  deployment_id text,
  git_sha text
);

create table if not exists public.cron_log_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  deployment_id text,
  request_id text,
  level text,
  message text,
  request_path text,
  raw jsonb
);

create table if not exists public.deploy_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  type text,
  deployment_id text,
  git_sha text,
  state text,
  raw jsonb
);

create index if not exists cron_runs_started_at_idx on public.cron_runs (started_at desc);
create index if not exists cron_log_events_received_at_idx on public.cron_log_events (received_at desc);
create index if not exists deploy_events_received_at_idx on public.deploy_events (received_at desc);

-- 2) scheduled_posts: permalink + updated_at en cada UPDATE -----------------
alter table public.scheduled_posts add column if not exists permalink text;

create or replace function public.scheduled_posts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scheduled_posts_set_updated_at on public.scheduled_posts;
create trigger scheduled_posts_set_updated_at
  before update on public.scheduled_posts
  for each row execute function public.scheduled_posts_set_updated_at();

-- 3) RLS: lectura de equipo (admin / vendedor) ------------------------------
alter table public.cron_runs enable row level security;
alter table public.cron_log_events enable row level security;
alter table public.deploy_events enable row level security;

drop policy if exists "Team can read cron_runs" on public.cron_runs;
create policy "Team can read cron_runs"
  on public.cron_runs for select to authenticated
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('admin', 'vendedor')));

drop policy if exists "Team can read cron_log_events" on public.cron_log_events;
create policy "Team can read cron_log_events"
  on public.cron_log_events for select to authenticated
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('admin', 'vendedor')));

drop policy if exists "Team can read deploy_events" on public.deploy_events;
create policy "Team can read deploy_events"
  on public.deploy_events for select to authenticated
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('admin', 'vendedor')));

-- 4) Realtime ----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cron_runs', 'cron_log_events', 'deploy_events'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
