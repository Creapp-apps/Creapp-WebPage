-- Migración: registro de avisos enviados al cliente por campaña (cuándo se le mandó el último mail).
-- Solo el equipo (admin/vendedor) puede leer e insertar; los clientes no ven nada.
-- Idempotente.

create table if not exists public.content_client_notifications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.content_campaigns(id) on delete cascade,
  sent_at timestamptz not null default now(),
  piece_count int not null default 0,
  sent_by uuid references auth.users(id)
);

create index if not exists idx_content_client_notifications_campaign_sent
  on public.content_client_notifications (campaign_id, sent_at desc);

alter table public.content_client_notifications enable row level security;

drop policy if exists "Team can read content_client_notifications" on public.content_client_notifications;
create policy "Team can read content_client_notifications"
  on public.content_client_notifications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

drop policy if exists "Team can insert content_client_notifications" on public.content_client_notifications;
create policy "Team can insert content_client_notifications"
  on public.content_client_notifications
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );
