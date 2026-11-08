-- ==============================================================================
-- TEST: visibilidad de borradores (Plan 5 admin ops)
-- Un miembro NO ve jobs con client_visible=false ni sus assets; SÍ los ve con
-- true; el equipo ve ambos. Requiere aplicadas 20261108130000 y 20261108140000.
-- Autochequeable, en transacción, termina con ROLLBACK. Falla con 'FALLO: <caso>'.
-- ==============================================================================
begin;

reset role;

do $$
declare
  c_a uuid := gen_random_uuid();
  camp_a uuid := gen_random_uuid();
  job_draft uuid := gen_random_uuid();
  job_pub uuid := gen_random_uuid();
  u_m uuid := gen_random_uuid(); -- miembro del cliente
  u_t uuid := gen_random_uuid(); -- equipo (admin)
begin
  insert into public.clients (id, slug, name) values (c_a, 'rls-draft-a', 'Cliente A (draft test)');
  insert into public.content_campaigns (id, client_id, slug) values (camp_a, c_a, 'camp-draft-a');

  insert into public.content_jobs (id, campaign_id, client_id, job_id_motor, type, client_visible) values
    (job_draft, camp_a, c_a, 'rls-draft-job-draft', 'reel', false),
    (job_pub, camp_a, c_a, 'rls-draft-job-pub', 'reel', true);

  insert into public.content_assets (job_id, kind, url) values
    (job_draft, 'video', 'https://example.test/draft.mp4'),
    (job_pub, 'video', 'https://example.test/pub.mp4');

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (u_m, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-draft-m@example.test', '{"role":"client"}'::jsonb),
    (u_t, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-draft-t@example.test', '{"role":"client"}'::jsonb);

  insert into public.client_members (client_id, user_id) values (c_a, u_m);

  -- El usuario de equipo se promueve explícitamente (no depende del metadato).
  update public.user_profiles set role = 'admin' where id = u_t;

  perform set_config('test.job_draft', job_draft::text, true);
  perform set_config('test.job_pub', job_pub::text, true);
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
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from current_setting('test.u_m')::uuid then
    raise exception 'FALLO: simulación de auth no aplicó (miembro)';
  end if;

  select count(*) into n from public.content_jobs
   where id = current_setting('test.job_draft')::uuid;
  if n <> 0 then
    raise exception 'FALLO: miembro ve un job client_visible=false';
  end if;

  select count(*) into n from public.content_jobs
   where id = current_setting('test.job_pub')::uuid;
  if n <> 1 then
    raise exception 'FALLO: miembro no ve su job client_visible=true (%)', n;
  end if;

  select count(*) into n from public.content_assets
   where job_id = current_setting('test.job_draft')::uuid;
  if n <> 0 then
    raise exception 'FALLO: miembro ve assets de un job client_visible=false';
  end if;

  select count(*) into n from public.content_assets
   where job_id = current_setting('test.job_pub')::uuid;
  if n <> 1 then
    raise exception 'FALLO: miembro no ve assets de un job client_visible=true (%)', n;
  end if;
end $$;

-- Equipo ------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_t'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from current_setting('test.u_t')::uuid then
    raise exception 'FALLO: simulación de auth no aplicó (equipo)';
  end if;

  select count(*) into n from public.content_jobs
   where id in (current_setting('test.job_draft')::uuid, current_setting('test.job_pub')::uuid);
  if n <> 2 then
    raise exception 'FALLO: equipo ve % de 2 jobs (borrador + publicado)', n;
  end if;

  select count(*) into n from public.content_assets
   where job_id in (current_setting('test.job_draft')::uuid, current_setting('test.job_pub')::uuid);
  if n <> 2 then
    raise exception 'FALLO: equipo ve % de 2 assets (borrador + publicado)', n;
  end if;
end $$;

reset role;
do $$ begin raise notice 'OK: visibilidad de borradores verificada'; end $$;

rollback;
