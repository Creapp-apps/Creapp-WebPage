-- ==============================================================================
-- MIGRACIÓN: Hilo de mensajes por pieza + UPDATE del equipo restringido por columna
-- (Plan 5 admin ops, Task 3). Aplicación a cargo del usuario.
-- ==============================================================================

-- 1. Hilo de mensajes equipo <-> cliente por pieza
create table if not exists public.content_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  author_role text not null check (author_role in ('team', 'client')),
  author_user_id uuid not null references public.user_profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists content_messages_job_id_idx on public.content_messages (job_id);

alter table public.content_messages enable row level security;

-- 2. Lectura
drop policy if exists "Team can read content_messages" on public.content_messages;
create policy "Team can read content_messages"
  on public.content_messages for select to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Members can read own content_messages" on public.content_messages;
create policy "Members can read own content_messages"
  on public.content_messages for select to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.id = content_messages.job_id
        and public.is_member_of(j.client_id)
        and j.client_visible = true
    )
  );

-- 3. Inserción: el rol y el autor no se pueden falsificar
drop policy if exists "Members can insert own content_messages" on public.content_messages;
create policy "Members can insert own content_messages"
  on public.content_messages for insert to authenticated
  with check (
    author_role = 'client'
    and author_user_id = auth.uid()
    and exists (
      select 1 from public.content_jobs j
      where j.id = content_messages.job_id
        and public.is_member_of(j.client_id)
        and j.client_visible = true
    )
  );

drop policy if exists "Team can insert content_messages" on public.content_messages;
create policy "Team can insert content_messages"
  on public.content_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
    and author_role = 'team'
    and author_user_id = auth.uid()
  );

-- 4. UPDATE del equipo (RLS filtra filas; las columnas se restringen aparte)
drop policy if exists "Team can update job visibility" on public.content_jobs;
create policy "Team can update job visibility"
  on public.content_jobs for update to authenticated
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin', 'vendedor'))
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin', 'vendedor'))
  );

drop policy if exists "Team can update campaign status" on public.content_campaigns;
create policy "Team can update campaign status"
  on public.content_campaigns for update to authenticated
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin', 'vendedor'))
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin', 'vendedor'))
  );

-- 5. Guardas por trigger (defensa en profundidad).
--    El grant de columnas es la barrera primaria, pero un grant a nivel tabla
--    futuro (o heredado) lo anularía en silencio. Estos triggers rechazan, para
--    cualquier actor que NO sea service_role/postgres (current_user = authenticated
--    o anon), el cambio de columnas fuera del conjunto permitido. El motor y las
--    migraciones corren con service_role/postgres y no se ven afectados.
create or replace function public.guard_content_jobs_team_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (to_jsonb(new) - array['client_visible', 'sent_at', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['client_visible', 'sent_at', 'updated_at']) then
      raise exception 'content_jobs: solo se pueden modificar client_visible y sent_at'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists content_jobs_guard_team_update on public.content_jobs;
create trigger content_jobs_guard_team_update
  before update on public.content_jobs
  for each row execute procedure public.guard_content_jobs_team_update();

create or replace function public.guard_content_campaigns_team_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (to_jsonb(new) - array['status', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'updated_at']) then
      raise exception 'content_campaigns: solo se puede modificar status'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists content_campaigns_guard_team_update on public.content_campaigns;
create trigger content_campaigns_guard_team_update
  before update on public.content_campaigns
  for each row execute procedure public.guard_content_campaigns_team_update();

-- 6. Grants
grant select, insert on public.content_messages to authenticated;
grant update (client_visible, sent_at) on public.content_jobs to authenticated;
grant update (status) on public.content_campaigns to authenticated;
