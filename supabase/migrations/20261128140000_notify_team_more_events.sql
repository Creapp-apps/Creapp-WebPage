-- ==============================================================================
-- MIGRACIÓN: Más avisos al equipo en app_notifications (Capa 2 del plan de notis).
-- 3 triggers nuevos, mismo patrón fail-closed/anti-fuga que notify_team_on_approval:
--   1) Sugerencia/mensaje del cliente en la Bandeja de entrada (content_inbox_messages)
--   2) Comentario del cliente en una pieza (content_messages)
--   3) Resultado de publicación programada (scheduled_posts → published/error)
-- Todas dirigidas a 'admin' y 'sales' (NUNCA 'all'). security definer, idempotentes,
-- y nunca rompen el INSERT/UPDATE que las dispara. Aplicación a cargo del usuario.
-- ==============================================================================

-- 1) Bandeja de entrada: el cliente deja un mensaje o una sugerencia de pieza.
create or replace function public.notify_team_on_inbox_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_client_id uuid;
  v_marca text;
  v_title text;
  v_body text;
  v_role text;
begin
  begin
    if NEW.author_role <> 'client' then
      return NEW;
    end if;
    select c.client_id into v_client_id from public.content_campaigns c where c.id = NEW.campaign_id;
    if v_client_id is not null then
      select cl.name into v_marca from public.clients cl where cl.id = v_client_id;
    end if;
    v_marca := coalesce(nullif(btrim(v_marca), ''), 'Un cliente');

    if NEW.kind = 'suggestion' then
      v_title := 'Nueva sugerencia de pieza';
      v_body := '«' || v_marca || '» te envió una sugerencia: ' || left(NEW.body, 200);
    else
      v_title := 'Mensaje en la bandeja';
      v_body := '«' || v_marca || '»: ' || left(NEW.body, 240);
    end if;

    foreach v_role in array array['admin', 'sales'] loop
      insert into public.app_notifications (type, title, body, url, target_role, metadata)
      values (
        'inbox_message', v_title, v_body, '/admin?tab=content_campaigns', v_role,
        jsonb_build_object('campaign_id', NEW.campaign_id, 'client_id', v_client_id, 'kind', NEW.kind)
      );
    end loop;
  exception when others then
    raise warning 'notify_team_on_inbox_message: %', sqlerrm;
    return NEW;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_team_on_inbox_message on public.content_inbox_messages;
create trigger trg_notify_team_on_inbox_message
  after insert on public.content_inbox_messages
  for each row execute function public.notify_team_on_inbox_message();


-- 2) Comentario del cliente en el hilo de una pieza (content_messages).
create or replace function public.notify_team_on_piece_comment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pieza text;
  v_client_id uuid;
  v_marca text;
  v_body text;
  v_role text;
begin
  begin
    if NEW.author_role <> 'client' then
      return NEW;
    end if;
    select j.title, j.client_id into v_pieza, v_client_id from public.content_jobs j where j.id = NEW.job_id;
    if v_client_id is not null then
      select cl.name into v_marca from public.clients cl where cl.id = v_client_id;
    end if;
    v_pieza := coalesce(nullif(btrim(v_pieza), ''), 'una pieza');
    v_marca := coalesce(nullif(btrim(v_marca), ''), 'Un cliente');
    v_body := '«' || v_marca || '» comentó en «' || v_pieza || '»: ' || left(NEW.body, 220);

    foreach v_role in array array['admin', 'sales'] loop
      insert into public.app_notifications (type, title, body, url, target_role, metadata)
      values (
        'piece_comment', 'Nuevo comentario del cliente', v_body, '/admin?tab=content_campaigns', v_role,
        jsonb_build_object('job_id', NEW.job_id, 'client_id', v_client_id)
      );
    end loop;
  exception when others then
    raise warning 'notify_team_on_piece_comment: %', sqlerrm;
    return NEW;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_team_on_piece_comment on public.content_messages;
create trigger trg_notify_team_on_piece_comment
  after insert on public.content_messages
  for each row execute function public.notify_team_on_piece_comment();


-- 3) Resultado de publicación programada (scheduled_posts → published / error).
create or replace function public.notify_team_on_publish_result()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pieza text;
  v_marca text;
  v_type text;
  v_title text;
  v_body text;
  v_role text;
begin
  begin
    if NEW.client_id is not null then
      select cl.name into v_marca from public.clients cl where cl.id = NEW.client_id;
    end if;
    if NEW.job_id is not null then
      -- scheduled_posts.job_id = content_jobs.job_id_motor (id del motor, text).
      select j.title into v_pieza from public.content_jobs j where j.job_id_motor = NEW.job_id limit 1;
    end if;
    v_pieza := coalesce(nullif(btrim(v_pieza), ''), 'una pieza');
    v_marca := coalesce(nullif(btrim(v_marca), ''), 'un cliente');

    if NEW.status = 'published' then
      v_type := 'publish_ok';
      v_title := 'Pieza publicada';
      v_body := 'Se publicó «' || v_pieza || '» de «' || v_marca || '» correctamente.';
    else
      v_type := 'publish_error';
      v_title := 'Falló una publicación';
      v_body := 'No se pudo publicar «' || v_pieza || '» de «' || v_marca || '».';
      if nullif(btrim(coalesce(NEW.error_message, '')), '') is not null then
        v_body := v_body || ' — ' || left(NEW.error_message, 240);
      end if;
    end if;

    foreach v_role in array array['admin', 'sales'] loop
      insert into public.app_notifications (type, title, body, url, target_role, metadata)
      values (
        v_type, v_title, v_body, '/admin?tab=content_campaigns', v_role,
        jsonb_build_object('scheduled_post_id', NEW.id, 'client_id', NEW.client_id, 'status', NEW.status)
      );
    end loop;
  exception when others then
    raise warning 'notify_team_on_publish_result: %', sqlerrm;
    return NEW;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_team_on_publish_result on public.scheduled_posts;
create trigger trg_notify_team_on_publish_result
  after update on public.scheduled_posts
  for each row
  when (new.status is distinct from old.status and new.status in ('published', 'error'))
  execute function public.notify_team_on_publish_result();


-- 4) Soporte para los AVISOS PREVIOS de publicación (Capa 4, cron publish-reminders).
--    reminder_sent_at: marca que el ping por pieza ya se envió (idempotencia).
alter table public.scheduled_posts add column if not exists reminder_sent_at timestamptz;

--    notification_daily_marks: una marca por día para el digest matinal (idempotente).
--    Solo la escribe el cron con service_role; RLS deny-all para el resto.
create table if not exists public.notification_daily_marks (
  mark_key text primary key,
  created_at timestamptz not null default now()
);
alter table public.notification_daily_marks enable row level security;
-- Sin policies: authenticated/anon no acceden; service_role (el cron) ignora RLS.
