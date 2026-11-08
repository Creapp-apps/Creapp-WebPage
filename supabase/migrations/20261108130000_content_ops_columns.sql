-- ==============================================================================
-- MIGRACIÓN: Columnas de visibilidad y producción en content_jobs (Plan 5, admin ops)
-- Idempotente: `add column if not exists` y backfill que no re-oculta nada en re-ejecución.
-- ==============================================================================

-- 1. Columnas nuevas en content_jobs
alter table public.content_jobs add column if not exists client_visible boolean not null default false;
alter table public.content_jobs add column if not exists sent_at timestamptz;
alter table public.content_jobs add column if not exists production_stage text;
alter table public.content_jobs add column if not exists rendered boolean not null default false;

-- 2. Backfill: las piezas existentes pasan a visibles para el cliente.
--    Una vez en true no vuelven a cambiar en re-ejecuciones.
update public.content_jobs
  set client_visible = true,
      sent_at = coalesce(sent_at, created_at)
  where client_visible = false;

-- 3. Backfill de campañas: 'draft' -> 'active'.
update public.content_campaigns
  set status = 'active'
  where status = 'draft';
