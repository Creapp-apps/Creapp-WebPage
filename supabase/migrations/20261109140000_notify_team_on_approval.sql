-- Migración: avisar al equipo cuando un cliente aprueba o pide cambios en una pieza.
-- Anti-fuga: se dirige a 'admin' y 'sales' (NUNCA 'all', que un cliente puede leer por RLS).
-- Idempotente.

create or replace function public.notify_team_on_content_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pieza text;
  v_client_id uuid;
  v_marca text;
  v_type text;
  v_title text;
  v_body text;
  v_role text;
begin
  begin
    select j.title, j.client_id into v_pieza, v_client_id
      from public.content_jobs j where j.id = NEW.job_id;
    if v_client_id is not null then
      select c.name into v_marca from public.clients c where c.id = v_client_id;
    end if;
    v_pieza := coalesce(nullif(btrim(v_pieza), ''), 'una pieza');
    v_marca := coalesce(nullif(btrim(v_marca), ''), 'un cliente');

    if NEW.decision = 'approved' then
      v_type := 'content_approved';
      v_title := 'Pieza aprobada';
      v_body := '«' || v_marca || '» aprobó «' || v_pieza || '».';
    else
      v_type := 'content_changes_requested';
      v_title := 'Cambios solicitados';
      v_body := '«' || v_marca || '» pidió cambios en «' || v_pieza || '»';
      if nullif(btrim(coalesce(NEW.comment, '')), '') is not null then
        v_body := v_body || ' — ' || left(NEW.comment, 300);
      end if;
    end if;

    foreach v_role in array array['admin', 'sales'] loop
      insert into public.app_notifications (type, title, body, url, target_role, metadata)
      values (
        v_type, v_title, v_body, '/admin?tab=content_campaigns', v_role,
        jsonb_build_object('job_id', NEW.job_id, 'client_id', v_client_id, 'decision', NEW.decision)
      );
    end loop;
  exception when others then
    -- Nunca romper el insert de la aprobación.
    raise warning 'notify_team_on_content_approval: %', sqlerrm;
    return NEW;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_team_on_content_approval on public.content_approvals;
create trigger trg_notify_team_on_content_approval
  after insert on public.content_approvals
  for each row execute function public.notify_team_on_content_approval();

-- Realtime sobre app_notifications (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_notifications'
  ) then
    alter publication supabase_realtime add table public.app_notifications;
  end if;
end $$;

-- Anti-fuga: endurecer la policy SELECT de app_notifications.
-- Antes: permitía lectura anónima (auth.uid() is null), 'all' y cualquier usuario con perfil veía 'sales'.
-- Ahora: sin anon, sin 'all', y cada usuario ve solo su rol de equipo real o sus avisos directos.
-- Un 'client' (role distinto de admin/vendedor) no ve filas de equipo.
drop policy if exists "Users can read relevant notifications" on public.app_notifications;
drop policy if exists "Read notifications by real role" on public.app_notifications;
create policy "Read notifications by real role"
  on public.app_notifications
  for select
  using (
    auth.uid() is not null
    and (
      target_user_id = auth.uid()
      or exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid()
          and (
            (app_notifications.target_role = 'admin' and up.role::text = 'admin')
            or (app_notifications.target_role = 'sales' and up.role::text = 'vendedor')
          )
      )
    )
  );

-- Seguridad: cerrar el INSERT permisivo. Un cliente del portal podía insertar
-- avisos falsos (target_role='admin' + url externa) que aparecían en el centro
-- de avisos del equipo (phishing / open-redirect). Los inserts legítimos vienen
-- del trigger security definer y de la función serverless con service_role,
-- ambos bypassean RLS, así que authenticated/anon no necesitan poder insertar.
drop policy if exists "Allow notification inserts" on public.app_notifications;
drop policy if exists "Only service role inserts notifications" on public.app_notifications;
create policy "Only service role inserts notifications"
  on public.app_notifications
  for insert
  to authenticated
  with check (false);
