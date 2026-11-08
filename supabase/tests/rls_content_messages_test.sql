-- ==============================================================================
-- TEST: content_messages + UPDATE del equipo restringido por columna (Plan 5)
-- Requiere aplicada 20261108150000 (y las previas). En transacción, ROLLBACK.
-- Falla con 'FALLO: <caso>'.
-- ==============================================================================
begin;

reset role;

do $$
declare
  c_a uuid := gen_random_uuid();
  c_b uuid := gen_random_uuid();
  camp_a uuid := gen_random_uuid();
  camp_b uuid := gen_random_uuid();
  job_a uuid := gen_random_uuid();
  job_b uuid := gen_random_uuid();
  job_draft uuid := gen_random_uuid();
  u_m uuid := gen_random_uuid();
  u_t uuid := gen_random_uuid();
begin
  insert into public.clients (id, slug, name) values
    (c_a, 'rls-msg-a', 'Cliente A (msg test)'),
    (c_b, 'rls-msg-b', 'Cliente B (msg test)');
  insert into public.content_campaigns (id, client_id, slug) values
    (camp_a, c_a, 'camp-msg-a'), (camp_b, c_b, 'camp-msg-b');
  insert into public.content_jobs (id, campaign_id, client_id, job_id_motor, type, client_visible) values
    (job_a, camp_a, c_a, 'rls-msg-job-a', 'reel', true),
    (job_b, camp_b, c_b, 'rls-msg-job-b', 'reel', true),
    (job_draft, camp_a, c_a, 'rls-msg-job-draft', 'reel', false);

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (u_m, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-msg-m@example.test', '{"role":"client"}'::jsonb),
    (u_t, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-msg-t@example.test', '{"role":"client"}'::jsonb);

  insert into public.client_members (client_id, user_id) values (c_a, u_m);

  -- Equipo: upsert, no depende de que el trigger haya creado la fila.
  insert into public.user_profiles (id, email, role)
  values (u_t, 'rls-msg-t@example.test', 'admin')
  on conflict (id) do update set role = 'admin';

  -- El miembro también necesita fila en user_profiles (fk de author_user_id).
  insert into public.user_profiles (id, email, role)
  values (u_m, 'rls-msg-m@example.test', 'client')
  on conflict (id) do nothing;

  perform set_config('test.job_a', job_a::text, true);
  perform set_config('test.job_b', job_b::text, true);
  perform set_config('test.job_draft', job_draft::text, true);
  perform set_config('test.camp_a', camp_a::text, true);
  perform set_config('test.u_m', u_m::text, true);
  perform set_config('test.u_t', u_t::text, true);
end $$;

-- Miembro -----------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_m'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
  denied boolean;
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from current_setting('test.u_m')::uuid then
    raise exception 'FALLO: simulación de auth no aplicó (miembro)';
  end if;

  -- (a) inserta y lee mensaje de cliente en su job
  insert into public.content_messages (job_id, author_role, author_user_id, body)
  values (current_setting('test.job_a')::uuid, 'client', current_setting('test.u_m')::uuid, 'hola');
  select count(*) into n from public.content_messages where job_id = current_setting('test.job_a')::uuid;
  if n <> 1 then raise exception 'FALLO: miembro no lee su mensaje (%)', n; end if;

  -- (b) no puede insertar como equipo
  denied := false;
  begin
    insert into public.content_messages (job_id, author_role, author_user_id, body)
    values (current_setting('test.job_a')::uuid, 'team', current_setting('test.u_m')::uuid, 'fake');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FALLO: miembro pudo insertar author_role=team'; end if;

  -- (c) no puede insertar en job de otro cliente
  denied := false;
  begin
    insert into public.content_messages (job_id, author_role, author_user_id, body)
    values (current_setting('test.job_b')::uuid, 'client', current_setting('test.u_m')::uuid, 'ajeno');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FALLO: miembro pudo insertar en job de otro cliente'; end if;

  -- (c2) borrador (client_visible=false) de su propio cliente: no inserta
  denied := false;
  begin
    insert into public.content_messages (job_id, author_role, author_user_id, body)
    values (current_setting('test.job_draft')::uuid, 'client', current_setting('test.u_m')::uuid, 'borrador');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FALLO: miembro pudo insertar en job borrador'; end if;

  -- spoofing de autor: author_user_id distinto de auth.uid() (usa al usuario de equipo, existe por FK)
  denied := false;
  begin
    insert into public.content_messages (job_id, author_role, author_user_id, body)
    values (current_setting('test.job_a')::uuid, 'client', current_setting('test.u_t')::uuid, 'spoof');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FALLO: miembro pudo falsificar author_user_id'; end if;
end $$;

-- Miembro no lee mensajes de un borrador (el equipo sí los sembró)
reset role;
insert into public.content_messages (job_id, author_role, author_user_id, body)
values (current_setting('test.job_draft')::uuid, 'team', current_setting('test.u_t')::uuid, 'nota interna');
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_m'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_messages where job_id = current_setting('test.job_draft')::uuid;
  if n <> 0 then raise exception 'FALLO: miembro lee mensajes de job borrador (%)', n; end if;
end $$;

-- Equipo ------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_t'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
  denied boolean;
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from current_setting('test.u_t')::uuid then
    raise exception 'FALLO: simulación de auth no aplicó (equipo)';
  end if;

  -- (d) inserta mensaje de equipo en cualquier job y lee todo
  insert into public.content_messages (job_id, author_role, author_user_id, body)
  values (current_setting('test.job_b')::uuid, 'team', current_setting('test.u_t')::uuid, 'respuesta');
  select count(*) into n from public.content_messages
   where job_id in (current_setting('test.job_a')::uuid, current_setting('test.job_b')::uuid);
  if n <> 2 then raise exception 'FALLO: equipo ve % de 2 mensajes', n; end if;

  -- equipo no puede falsificar rol de cliente
  denied := false;
  begin
    insert into public.content_messages (job_id, author_role, author_user_id, body)
    values (current_setting('test.job_a')::uuid, 'client', current_setting('test.u_t')::uuid, 'x');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FALLO: equipo pudo insertar author_role=client'; end if;

  -- (e) UPDATE column-restricted sobre content_jobs
  update public.content_jobs set client_visible = false where id = current_setting('test.job_a')::uuid;
  select count(*) into n from public.content_jobs
   where id = current_setting('test.job_a')::uuid and client_visible = false;
  if n <> 1 then raise exception 'FALLO: equipo no pudo cambiar client_visible'; end if;

  denied := false;
  begin
    update public.content_jobs set production_stage = 'x' where id = current_setting('test.job_a')::uuid;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FALLO: equipo pudo cambiar production_stage'; end if;

  -- (f) UPDATE de status en content_campaigns
  update public.content_campaigns set status = 'closed' where id = current_setting('test.camp_a')::uuid;
  select count(*) into n from public.content_campaigns
   where id = current_setting('test.camp_a')::uuid and status = 'closed';
  if n <> 1 then raise exception 'FALLO: equipo no pudo cambiar status de campaña'; end if;
end $$;

reset role;

-- Trigger-only: el grant de columnas ya bloquea type/title, así que para probar
-- el TRIGGER (defensa en profundidad) se ensancha el grant a nivel tabla; todo se
-- revierte con el ROLLBACK final.
grant update on public.content_jobs to authenticated;
grant update on public.content_campaigns to authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_t'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
  denied boolean;
begin
  denied := false;
  begin
    update public.content_jobs set type = 'x' where id = current_setting('test.job_a')::uuid;
  exception when insufficient_privilege or raise_exception then denied := true;
  end;
  if not denied then raise exception 'FALLO: trigger no bloqueó content_jobs.type'; end if;

  denied := false;
  begin
    update public.content_campaigns set title = 'x' where id = current_setting('test.camp_a')::uuid;
  exception when insufficient_privilege or raise_exception then denied := true;
  end;
  if not denied then raise exception 'FALLO: trigger no bloqueó content_campaigns.title'; end if;

  -- sigue permitido lo legítimo con el grant ancho
  update public.content_jobs set sent_at = now() where id = current_setting('test.job_a')::uuid;
  update public.content_campaigns set status = 'open' where id = current_setting('test.camp_a')::uuid;
  select count(*) into n from public.content_campaigns
   where id = current_setting('test.camp_a')::uuid and status = 'open';
  if n <> 1 then raise exception 'FALLO: trigger bloqueó un cambio legítimo de status'; end if;
end $$;

reset role;
do $$ begin raise notice 'OK: content_messages y UPDATE del equipo verificados'; end $$;

rollback;
