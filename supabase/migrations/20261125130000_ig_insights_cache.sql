-- Caché server-only de insights de Instagram por cliente (realm portal).
-- La llave es el SLUG del cliente (misma que el token META_ACCESS_TOKEN__<slug>
-- y scheduled_posts.client_id). Solo el service role (los endpoints server)
-- lee/escribe: sin policies de member. Ver spec §6.1.
-- Correr completa en el SQL Editor de Supabase. Idempotente.

create table if not exists public.ig_insights_cache (
  client_id text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.ig_insights_cache enable row level security;
