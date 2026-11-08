-- Habilita Realtime en las tablas de contenido (Plan 4, fusión Creador -> CreAPP).
-- Idempotente: agrega cada tabla a la publicación supabase_realtime solo si
-- todavía no está. Se puede correr más de una vez sin error.

do $$
begin
  -- content_jobs: trabajos de contenido (cambios de estado en vivo en el panel).
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_jobs'
  ) then
    alter publication supabase_realtime add table public.content_jobs;
  end if;

  -- content_approvals: aprobaciones de piezas (se refleja al instante en el tablero).
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_approvals'
  ) then
    alter publication supabase_realtime add table public.content_approvals;
  end if;

  -- content_campaigns: campañas de contenido (progreso y estado en vivo).
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_campaigns'
  ) then
    alter publication supabase_realtime add table public.content_campaigns;
  end if;
end $$;
