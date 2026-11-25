-- Branding sync: la tipografía de marca del cliente (headline) para tematizar el
-- portal con la MISMA fuente de sus piezas. Se agrega a clients y se expone por la
-- vista client_public (que el cliente lee; la tabla cruda queda oculta).
-- Correr completa en el SQL Editor de Supabase. Idempotente.

alter table public.clients add column if not exists brand_font text;

-- Recrea la vista sumando brand_font (mismo gate is_member_of, solo lectura).
create or replace view public.client_public
  with (security_invoker = false) as
  select id, slug, name, logo_url, brand_colors, brand_font
    from public.clients
   where public.is_member_of(id);

revoke all on public.client_public from public, anon, authenticated;
grant select on public.client_public to authenticated;
