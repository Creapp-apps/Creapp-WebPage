-- FIX del RLS de modo en vivo (P4). La policy anterior resolvía slug→uuid con un
-- subselect sobre public.clients EJECUTADO BAJO EL RLS DEL MIEMBRO. Pero el miembro
-- NO tiene policy de select sobre clients (20261107160000_portal_branding.sql dropeó
-- "Members can read own client"; lee la marca por la vista client_public). → el
-- subselect devolvía NULL → is_member_of(NULL)=false → el miembro leía 0 filas →
-- el portal quedaba en "Tu campaña se está preparando".
-- Además, el check de visibilidad sobre content_jobs corría bajo el RLS del miembro
-- (que solo ve client_visible=true), así que no ocultaba nada.
--
-- Solución: una función SECURITY DEFINER que resuelve el slug y el gate de
-- visibilidad SALTEANDO RLS. is_member_of sigue usando el auth.uid() real (SECURITY
-- DEFINER cambia privilegios, no el contexto de auth). Fail-closed: no-miembro o
-- slug inexistente → false; job explícitamente client_visible=false → oculto.
-- Correr completa en el SQL Editor de Supabase. Idempotente.

create or replace function public.member_can_read_scheduled_post(p_client_slug text, p_job_id_motor text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_member_of((select id from public.clients where slug = p_client_slug))
     and not exists (
       select 1 from public.content_jobs j
       where j.job_id_motor = p_job_id_motor and j.client_visible = false
     );
$$;

revoke all on function public.member_can_read_scheduled_post(text, text) from public;
grant execute on function public.member_can_read_scheduled_post(text, text) to authenticated;

drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (public.member_can_read_scheduled_post(scheduled_posts.client_id, scheduled_posts.job_id));
