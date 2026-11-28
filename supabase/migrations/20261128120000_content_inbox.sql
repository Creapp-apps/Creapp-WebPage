-- ==============================================================================
-- MIGRACIÓN: Bandeja de entrada a nivel CAMPAÑA (equipo <-> cliente).
-- Hilo general de la campaña + sugerencias de piezas del cliente.
-- Espeja el modelo fail-closed de content_messages (por pieza), pero keyed por
-- campaign_id. Aplicación a cargo del usuario.
-- ==============================================================================

-- 1. Mensajes del inbox de la campaña
create table if not exists public.content_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.content_campaigns(id) on delete cascade,
  author_role text not null check (author_role in ('team', 'client')),
  author_user_id uuid not null references public.user_profiles(id),
  kind text not null default 'message' check (kind in ('message', 'suggestion')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists content_inbox_messages_campaign_idx
  on public.content_inbox_messages (campaign_id, created_at);

alter table public.content_inbox_messages enable row level security;

-- 1a. Lectura
drop policy if exists "Team can read inbox" on public.content_inbox_messages;
create policy "Team can read inbox"
  on public.content_inbox_messages for select to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Members can read own inbox" on public.content_inbox_messages;
create policy "Members can read own inbox"
  on public.content_inbox_messages for select to authenticated
  using (
    exists (
      select 1 from public.content_campaigns c
      where c.id = content_inbox_messages.campaign_id
        and public.is_member_of(c.client_id)
    )
  );

-- 1b. Inserción: el rol y el autor no se pueden falsificar
drop policy if exists "Members can insert own inbox" on public.content_inbox_messages;
create policy "Members can insert own inbox"
  on public.content_inbox_messages for insert to authenticated
  with check (
    author_role = 'client'
    and author_user_id = auth.uid()
    and exists (
      select 1 from public.content_campaigns c
      where c.id = content_inbox_messages.campaign_id
        and public.is_member_of(c.client_id)
    )
  );

drop policy if exists "Team can insert inbox" on public.content_inbox_messages;
create policy "Team can insert inbox"
  on public.content_inbox_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
    and author_role = 'team'
    and author_user_id = auth.uid()
  );

-- 2. Marcador de lectura por usuario y campaña (para el badge de no leídos).
--    Cada quien solo escribe su propia fila; los mensajes siguen protegidos por
--    la RLS de arriba.
create table if not exists public.content_inbox_reads (
  campaign_id uuid not null references public.content_campaigns(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

alter table public.content_inbox_reads enable row level security;

drop policy if exists "Read own inbox marker" on public.content_inbox_reads;
create policy "Read own inbox marker"
  on public.content_inbox_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Insert own inbox marker" on public.content_inbox_reads;
create policy "Insert own inbox marker"
  on public.content_inbox_reads for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Update own inbox marker" on public.content_inbox_reads;
create policy "Update own inbox marker"
  on public.content_inbox_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Grants
grant select, insert on public.content_inbox_messages to authenticated;
grant select, insert, update on public.content_inbox_reads to authenticated;

-- 4. Realtime: reflejar los mensajes nuevos al instante en ambos lados.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_inbox_messages'
  ) then
    alter publication supabase_realtime add table public.content_inbox_messages;
  end if;
end $$;
