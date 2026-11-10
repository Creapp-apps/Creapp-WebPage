-- ==============================================================================
-- MIGRACIÓN: Copy separado en content_jobs (descripción + hashtags)
-- El portal mostraba solo `caption`. El motor (Creador) ya genera hashtags y
-- (a futuro) una descripción aparte en publish_copy.json; estas columnas los
-- reciben para que el modal del portal los muestre como bloques propios.
-- Idempotente y seguro de re-aplicar.
-- ==============================================================================

alter table public.content_jobs add column if not exists description text;
alter table public.content_jobs add column if not exists hashtags text[] not null default '{}';
