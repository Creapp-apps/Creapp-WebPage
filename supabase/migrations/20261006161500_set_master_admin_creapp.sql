-- ==============================================================================
-- MIGRACIÓN / SCRIPT: Alta de Master Admin Oficial (creapp.ar@gmail.com)
-- CreApp Innovation Hub
-- ==============================================================================

-- 1. Habilitar extensión pgcrypto para hashing de contraseñas
create extension if not exists pgcrypto;

-- 2. Asegurar que creapp.ar@gmail.com exista en auth.users con la contraseña especificada
do $$
declare
  v_user_id uuid;
begin
  -- Buscar si ya existe el usuario
  select id into v_user_id from auth.users where email = 'creapp.ar@gmail.com';

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'creapp.ar@gmail.com',
      crypt('CreAPP2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Master Admin CreAPP","role":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    -- Actualizar contraseña y metadata si ya existía
    update auth.users
    set 
      encrypted_password = crypt('CreAPP2026!', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = raw_user_meta_data || '{"full_name":"Master Admin CreAPP","role":"admin"}'::jsonb,
      updated_at = now()
    where id = v_user_id;
  end if;

  -- 3. Asegurar perfil en public.user_profiles con rol admin
  insert into public.user_profiles (id, email, role, full_name, updated_at)
  values (v_user_id, 'creapp.ar@gmail.com', 'admin'::public.user_role, 'Master Admin CreAPP', now())
  on conflict (id) do update
  set 
    role = 'admin'::public.user_role,
    full_name = 'Master Admin CreAPP',
    updated_at = now();

end $$;
