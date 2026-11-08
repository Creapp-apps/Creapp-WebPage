-- ==============================================================================
-- MIGRACIÓN: Columnas de visibilidad y producción en content_jobs (Plan 5, admin ops)
-- Idempotente y seguro de re-aplicar: el backfill corre UNA sola vez, atado a la
-- creación de la columna. Re-aplicar la migración NO re-publica borradores que el
-- equipo haya ocultado después (client_visible=false), ni reactiva campañas cerradas.
-- ==============================================================================

do $$
declare
  v_fresh boolean;
begin
  -- ¿La columna client_visible ya existía antes de esta corrida?
  v_fresh := not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'content_jobs'
      and column_name = 'client_visible'
  );

  -- 1. Columnas nuevas (idempotentes).
  alter table public.content_jobs add column if not exists client_visible boolean not null default false;
  alter table public.content_jobs add column if not exists sent_at timestamptz;
  alter table public.content_jobs add column if not exists production_stage text;
  alter table public.content_jobs add column if not exists rendered boolean not null default false;

  -- 2. Backfill one-shot: SOLO la primera vez (cuando la columna recién se creó).
  --    Así las piezas que ya veía el cliente quedan visibles, pero un re-run
  --    jamás vuelve a exponer un borrador posterior.
  if v_fresh then
    update public.content_jobs
      set client_visible = true,
          sent_at = coalesce(sent_at, created_at);

    update public.content_campaigns
      set status = 'active'
      where status = 'draft';
  end if;
end $$;

-- 3. Las campañas nuevas nacen vigentes ('active'), no 'draft' (el chip
--    vigente/cerrada solo conoce {active, closed}). Idempotente: corre siempre.
alter table public.content_campaigns alter column status set default 'active';
