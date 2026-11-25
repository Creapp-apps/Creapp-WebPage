-- Reemplaza la policy de P1 (gate por content_jobs) para habilitar "modo en vivo":
-- el miembro lee SUS scheduled_posts por membresía (slug→uuid), sin depender de
-- content_jobs. Oculta un post solo si su content_jobs está explícitamente
-- client_visible=false (preserva el gate de review de P1). Ver spec §4.1.
-- Correr completa en el SQL Editor de Supabase. Idempotente.

drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    public.is_member_of((select id from public.clients where slug = scheduled_posts.client_id))
    and not exists (
      select 1 from public.content_jobs j
      where j.job_id_motor = scheduled_posts.job_id and j.client_visible = false
    )
  );
