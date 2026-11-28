-- ==============================================================================
-- MIGRACIÓN: Leído de la campanita sincronizado en DB (cross-device).
-- El estado "leído" vivía en localStorage por navegador. Ahora se persiste en
-- app_notifications.read_by (jsonb array con los auth.uid que ya la leyeron).
-- La columna read_by ya existe (20261006233000_create_notifications_table.sql).
-- RPC security definer: el usuario solo agrega SU propio uid. Aplicación a cargo
-- del usuario.
-- ==============================================================================

-- Marca una notificación como leída por el usuario actual (idempotente).
create or replace function public.mark_app_notification_read(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.app_notifications
     set read_by = coalesce(read_by, '[]'::jsonb) || to_jsonb(auth.uid()::text)
   where id = p_id
     and not (coalesce(read_by, '[]'::jsonb) ? auth.uid()::text);
$$;

-- Marca como leídas todas las notificaciones visibles para el usuario actual.
-- Replica la condición de la RLS de lectura para no tocar filas ajenas.
create or replace function public.mark_all_app_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.app_notifications n
     set read_by = coalesce(read_by, '[]'::jsonb) || to_jsonb(auth.uid()::text)
   where not (coalesce(read_by, '[]'::jsonb) ? auth.uid()::text)
     and (
       n.target_user_id = auth.uid()
       or (n.target_role = 'admin'
           and exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin'))
       or (n.target_role = 'sales'
           and exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'vendedor'))
     );
$$;

revoke all on function public.mark_app_notification_read(uuid) from public;
revoke all on function public.mark_all_app_notifications_read() from public;
grant execute on function public.mark_app_notification_read(uuid) to authenticated, service_role;
grant execute on function public.mark_all_app_notifications_read() to authenticated, service_role;
