do $$ begin
  create type public.account_type as enum ('saving', 'current', 'fixed');
exception when duplicate_object then null; end $$;

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  account_type public.account_type not null,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  status text not null default 'active' check (status in ('active','closed','frozen')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique(customer_id, account_type)
);

alter table public.customer_accounts enable row level security;

drop policy if exists accounts_read on public.customer_accounts;
create policy accounts_read on public.customer_accounts
for select
using (customer_id = auth.uid() or public.is_manager_or_head());

grant select on public.customer_accounts to authenticated;

