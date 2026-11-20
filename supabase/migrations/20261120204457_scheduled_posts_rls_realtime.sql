-- Habilita lectura de equipo y realtime sobre scheduled_posts (motor/cron),
-- para el tracker de contenido. Ver
-- docs/superpowers/specs/2026-11-20-estado-publicacion-tracker-design.md
-- Mismo patrón que content_jobs en 20261107120000_create_content_foundation.sql.

alter table public.scheduled_posts enable row level security;

drop policy if exists "Team can read scheduled_posts" on public.scheduled_posts;
create policy "Team can read scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scheduled_posts'
  ) then
    alter publication supabase_realtime add table public.scheduled_posts;
  end if;
end $$;
