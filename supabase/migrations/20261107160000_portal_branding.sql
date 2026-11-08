-- ==============================================================================
-- Plan 3 (portal del cliente): branding + cierre del gate de columnas de clients
-- Idempotente.
-- ==============================================================================

-- 1. Columnas de branding del cliente (ej. {"primary":"#002655","accent":"#9A5B34","light":"#F4F1EA"})
alter table public.clients add column if not exists logo_url text;
alter table public.clients add column if not exists brand_colors jsonb;

-- 2. Concepto/temática del mes (texto visible para el cliente)
alter table public.content_campaigns add column if not exists concept text;

-- 3. Vista pública de marca. security_invoker = false: la vista lee 'clients' como
--    su owner (saltea la RLS de la tabla cruda); el filtro is_member_of(id) usa
--    auth.uid() del invocador, así cada cliente ve SOLO su fila y SOLO estas columnas.
create or replace view public.client_public
  with (security_invoker = false) as
  select id, slug, name, logo_url, brand_colors
    from public.clients
   where public.is_member_of(id);

-- La vista es auto-actualizable y corre como owner: hay que dejarla SOLO lectura.
-- (Los default privileges de Supabase darían ALL a anon/authenticated.)
revoke all on public.client_public from public, anon, authenticated;
grant select on public.client_public to authenticated;

-- 4. Cierra el gate: el cliente ya no lee la tabla cruda 'clients' (columnas internas).
--    El equipo conserva su policy "Team can read ..." (no se toca).
drop policy if exists "Members can read own client" on public.clients;
