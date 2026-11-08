-- ==============================================================================
-- TEST: RLS de acceso de cliente (Plan 2 fusión Creador -> CreAPP)
-- Script autochequeable: corre en una transacción, simula JWT de clientes y
-- falla con 'FALLO: <caso>' si algo no se cumple. Termina con ROLLBACK, así que
-- no persiste nada. Correr en el SQL Editor de Supabase o con psql.
-- Los uuids de prueba viajan en settings locales (set_config(..., true)) para
-- que sean legibles también cuando cambiamos de rol a 'authenticated'.
-- ==============================================================================
begin;

-- 1. Seed como superusuario (bypass de RLS) ------------------------------------
reset role;

do $$
declare
  c_a uuid := gen_random_uuid();
  c_b uuid := gen_random_uuid();
  camp_a uuid := gen_random_uuid();
  camp_b uuid := gen_random_uuid();
  job_a uuid := gen_random_uuid();
  job_b uuid := gen_random_uuid();
  u_a uuid := gen_random_uuid();
  u_b uuid := gen_random_uuid();
  u_x uuid := gen_random_uuid(); -- usuario sin membresía
begin
  insert into public.clients (id, slug, name) values
    (c_a, 'rls-test-a', 'Cliente A (test)'),
    (c_b, 'rls-test-b', 'Cliente B (test)');

  insert into public.content_campaigns (id, client_id, slug) values
    (camp_a, c_a, 'camp-a'), (camp_b, c_b, 'camp-b');

  insert into public.content_jobs (id, campaign_id, client_id, job_id_motor, type) values
    (job_a, camp_a, c_a, 'rls-test-job-a', 'reel'),
    (job_b, camp_b, c_b, 'rls-test-job-b', 'reel');

  insert into public.content_assets (job_id, kind, url) values
    (job_a, 'video', 'https://example.test/a.mp4'),
    (job_b, 'video', 'https://example.test/b.mp4');

  -- Usuarios en auth.users: el trigger handle_new_user crea user_profiles con
  -- role 'client' gracias al metadato (no se duplica a mano).
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (u_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-test-a@example.test', '{"role":"client"}'::jsonb),
    (u_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rls-test-b@example.test', '{"role":"client"}'::jsonb);

  insert into public.client_members (client_id, user_id) values
    (c_a, u_a), (c_b, u_b);

  perform set_config('test.c_a', c_a::text, true);
  perform set_config('test.c_b', c_b::text, true);
  perform set_config('test.camp_a', camp_a::text, true);
  perform set_config('test.job_a', job_a::text, true);
  perform set_config('test.job_b', job_b::text, true);
  perform set_config('test.u_a', u_a::text, true);
  perform set_config('test.u_b', u_b::text, true);
  perform set_config('test.u_x', u_x::text, true);
end $$;

-- 2. Simular al usuario uA -----------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_a'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
  denied boolean;
begin
  -- Guard anti-falso-verde: la simulación de auth debe haber aplicado
  if current_user <> 'authenticated' or auth.uid() is distinct from current_setting('test.u_a')::uuid then
    raise exception 'FALLO: simulación de auth no aplicó';
  end if;

  -- Caso 2: aislamiento de lectura
  select count(*) into n from public.content_jobs;
  if n <> 1 then
    raise exception 'FALLO: uA ve % content_jobs (esperado 1)', n;
  end if;

  select count(*) into n from public.content_jobs
   where client_id = current_setting('test.c_b')::uuid;
  if n <> 0 then
    raise exception 'FALLO: uA ve jobs del cliente B (%)', n;
  end if;

  select count(*) into n from public.content_assets;
  if n <> 1 then
    raise exception 'FALLO: uA ve % content_assets (esperado 1)', n;
  end if;

  select count(*) into n from public.content_assets
   where job_id = current_setting('test.job_b')::uuid;
  if n <> 0 then
    raise exception 'FALLO: uA ve assets del job de B';
  end if;

  select count(*) into n from public.clients;
  if n <> 1 then
    raise exception 'FALLO: uA ve % clients (esperado 1)', n;
  end if;

  -- Caso 3a: approval propia sobre job de A -> OK
  insert into public.content_approvals (job_id, client_user_id, decision)
  values (current_setting('test.job_a')::uuid, current_setting('test.u_a')::uuid, 'approved');

  select count(*) into n from public.content_approvals;
  if n <> 1 then
    raise exception 'FALLO: uA no ve su approval recién creada (%)', n;
  end if;

  -- Caso 3b: approval sobre job de B -> debe fallar
  denied := false;
  begin
    insert into public.content_approvals (job_id, client_user_id, decision)
    values (current_setting('test.job_b')::uuid, current_setting('test.u_a')::uuid, 'approved');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FALLO: uA pudo aprobar un job de otro cliente (B)';
  end if;

  -- Caso 3c: approval a nombre de otro usuario sobre job de A -> debe fallar
  denied := false;
  begin
    insert into public.content_approvals (job_id, client_user_id, decision)
    values (current_setting('test.job_a')::uuid, current_setting('test.u_b')::uuid, 'approved');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FALLO: uA pudo insertar una approval suplantando a uB';
  end if;

  -- Caso 4: el cliente no escribe contenido
  denied := false;
  begin
    -- todas las columnas NOT NULL completas: el único rechazo posible es RLS
    insert into public.content_jobs (campaign_id, client_id, job_id_motor, type, status)
    values (current_setting('test.camp_a')::uuid, current_setting('test.c_a')::uuid,
            'rls-test-job-hack', 'reel', 'sent');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FALLO: uA pudo insertar en content_jobs';
  end if;

  -- Update de contenido: sin policy, no debe afectar ninguna fila
  update public.content_jobs set status = 'hacked';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALLO: uA pudo actualizar % content_jobs', n;
  end if;
end $$;

-- 3. Usuario sin membresía -----------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.u_x'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
begin
  -- Guard anti-falso-verde: la simulación de auth debe haber aplicado
  if current_user <> 'authenticated' or auth.uid() is distinct from current_setting('test.u_x')::uuid then
    raise exception 'FALLO: simulación de auth no aplicó';
  end if;

  -- Caso 5
  select count(*) into n from public.content_jobs;
  if n <> 0 then
    raise exception 'FALLO: usuario sin membresia ve % content_jobs (esperado 0)', n;
  end if;
  select count(*) into n from public.content_assets;
  if n <> 0 then
    raise exception 'FALLO: usuario sin membresia ve % content_assets', n;
  end if;
  select count(*) into n from public.content_approvals;
  if n <> 0 then
    raise exception 'FALLO: usuario sin membresia ve % content_approvals', n;
  end if;
end $$;

-- 4. Si llegó hasta acá, todo pasó ---------------------------------------------
reset role;
do $$ begin raise notice 'OK: RLS de acceso de cliente verificado'; end $$;

-- Caso 6: no persistir nada
rollback;
