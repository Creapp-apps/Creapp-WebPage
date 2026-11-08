-- ==============================================================================
-- MIGRACIÓN: El cliente solo lee contenido publicado (client_visible = true)
-- (Plan 5, admin ops). Depende de 20261108130000_content_ops_columns.sql.
-- Reescribe las policies de lectura de miembros sobre content_jobs y
-- content_assets. Las policies del equipo ("Team can read ...") no se tocan:
-- el equipo sigue viendo borradores.
-- ==============================================================================

drop policy if exists "Members can read own content_jobs" on public.content_jobs;
create policy "Members can read own content_jobs"
  on public.content_jobs
  for select
  to authenticated
  using (public.is_member_of(client_id) and client_visible = true);

drop policy if exists "Members can read own content_assets" on public.content_assets;
create policy "Members can read own content_assets"
  on public.content_assets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.id = content_assets.job_id
        and public.is_member_of(j.client_id)
        and j.client_visible = true
    )
  );
