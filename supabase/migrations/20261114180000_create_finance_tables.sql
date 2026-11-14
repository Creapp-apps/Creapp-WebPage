-- ==============================================================================
-- MIGRACIÓN: Finanzas compartidas -> Supabase
-- Suscripciones (abonos/MRR) + Transacciones (cobros/gastos, OPEX).
-- Antes guardaban en localStorage (cada navegador veía SUS datos). Ahora
-- compartido entre el equipo (Seba/Facu) + Realtime. Espejo de las interfaces
-- Subscription y FinanceTransaction en src/lib/financeService.ts.
-- ==============================================================================

-- 1. Suscripciones (abonos recurrentes)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  company_name text,
  plan_name text,
  category text not null default 'retainer',
  product_type text,
  amount numeric not null default 0,
  currency text not null default 'USD',
  billing_day text,
  billing_cycle text not null default 'monthly',
  status text not null default 'active',
  start_date date,
  next_billing_date date,
  last_payment_date date,
  payment_method text,
  payment_link text,
  client_phone text,
  client_email text,
  notes text,
  lead_id text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Transacciones (cobros/ingresos y gastos/egresos)
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'expense',
  concept text not null,
  provider text,
  category text not null default 'other',
  amount numeric not null default 0,
  currency text not null default 'USD',
  date date not null default current_date,
  payment_method text,
  recurring boolean not null default false,
  status text not null default 'paid',
  receipt_number text,
  notes text,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists finance_tx_type_idx on public.finance_transactions (type);
create index if not exists finance_tx_date_idx on public.finance_transactions (date desc);

-- 3. updated_at automático
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists finance_tx_set_updated_at on public.finance_transactions;
create trigger finance_tx_set_updated_at
  before update on public.finance_transactions
  for each row execute function public.set_updated_at();

-- 4. RLS: el equipo (admin/vendedor) lee y escribe todo
alter table public.subscriptions enable row level security;
alter table public.finance_transactions enable row level security;

drop policy if exists "Team manages subscriptions" on public.subscriptions;
create policy "Team manages subscriptions"
  on public.subscriptions for all to authenticated
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','vendedor')))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','vendedor')));

drop policy if exists "Team manages finance_transactions" on public.finance_transactions;
create policy "Team manages finance_transactions"
  on public.finance_transactions for all to authenticated
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','vendedor')))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','vendedor')));

-- 5. Realtime
alter publication supabase_realtime add table public.subscriptions;
alter publication supabase_realtime add table public.finance_transactions;
