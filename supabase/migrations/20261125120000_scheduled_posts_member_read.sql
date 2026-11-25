-- El cliente (realm portal) lee sus scheduled_posts, gateado por content_jobs
-- (client_id uuid + client_visible = true), espejo de content_visibility_rls.
-- No se gatea por scheduled_posts.client_id porque es SLUG, e is_member_of toma uuid.
-- Ver docs/superpowers/specs/2026-11-25-portal-cliente-shell-calendario-design.md §5.1
-- Correr completa en el SQL Editor de Supabase. Idempotente.

drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.job_id_motor = scheduled_posts.job_id
        and public.is_member_of(j.client_id)
        and j.client_visible = true
    )
  );

create index if not exists idx_content_jobs_job_id_motor
  on public.content_jobs (job_id_motor);
