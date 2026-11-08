-- Run ONCE in Supabase SQL Editor, after supabase.sql and supabaseadmin.sql

alter table orders
  add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed')),
  add column if not exists payment_ref text;
-- unpaid = Cash on Delivery (collect on delivery) | pending = waiting for bKash/Nagad | paid | failed

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null,
  provider text not null check (provider in ('bkash','nagad')),
  amount numeric not null,
  status text not null default 'initiated' check (status in ('initiated','paid','failed','cancelled')),
  provider_order_id text, provider_ref text, provider_trx text,
  created_at timestamptz default now(), paid_at timestamptz
);
create unique index if not exists payments_ref_uq on payments(provider, provider_ref) where provider_ref is not null;
create unique index if not exists payments_trx_uq on payments(provider, provider_trx) where provider_trx is not null;
create index if not exists payments_user_time on payments(user_id, created_at);

-- No policies on purpose: only the server (service role) can touch payments.
alter table payments enable row level security;
revoke all on payments from anon, authenticated;

-- Customers can create only plain unpaid orders (COD). They can never mark an order paid.
drop policy if exists "own orders insert" on orders;
create policy "own orders insert" on orders for insert to authenticated
  with check (user_id = auth.uid() and status = 0 and payment_status = 'unpaid' and payment_ref is null);

-- Customers don't see half-finished online-payment attempts
drop policy if exists "own orders read" on orders;
create policy "own orders read" on orders for select to authenticated
  using (user_id = auth.uid() and payment_status in ('unpaid','paid'));
