create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('customer', 'manager', 'head');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.account_type as enum ('saving', 'current', 'fixed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.transaction_type as enum ('credit', 'debit', 'reversal', 'opening_balance');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.money_method as enum ('liquid', 'online');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.request_status as enum ('pending', 'approved', 'rejected', 'used');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  cic_no text not null unique,
  customer_id text unique,
  name text,
  class_name text,
  phone text,
  email text unique,
  photo_url text,
  force_password_change boolean not null default false,
  assistant_manager_name text,
  assistant_manager_cic_no text,
  assistant_manager_class text,
  assistant_manager_phone text,
  assistant_manager_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_cic_format check (cic_no ~ '^[A-Za-z0-9_-]+$')
);

create table if not exists public.manager_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_user_id uuid references public.profiles(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_active boolean not null default false,
  opening_liquid_balance numeric(14,2) not null default 0 check (opening_liquid_balance >= 0),
  opening_online_balance numeric(14,2) not null default 0 check (opening_online_balance >= 0),
  opening_total_balance numeric(14,2) generated always as (opening_liquid_balance + opening_online_balance) stored,
  closing_liquid_balance numeric(14,2) check (closing_liquid_balance >= 0),
  closing_online_balance numeric(14,2) check (closing_online_balance >= 0),
  closing_total_balance numeric(14,2) generated always as (coalesce(closing_liquid_balance,0) + coalesce(closing_online_balance,0)) stored,
  total_credited numeric(14,2) not null default 0,
  total_debited numeric(14,2) not null default 0,
  income_credited numeric(14,2) not null default 0,
  income_debited numeric(14,2) not null default 0,
  transaction_count integer not null default 0
);

create unique index if not exists one_active_manager_period on public.manager_periods(is_active) where is_active;

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

create table if not exists public.bank_cash_positions (
  id integer primary key default 1 check (id = 1),
  liquid_balance numeric(14,2) not null default 0 check (liquid_balance >= 0),
  online_balance numeric(14,2) not null default 0 check (online_balance >= 0),
  updated_at timestamptz not null default now()
);

insert into public.bank_cash_positions (id, liquid_balance, online_balance)
values (1, 0, 0)
on conflict (id) do nothing;

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.customer_accounts(id),
  request_type text not null check (request_type in ('fixed_full','saving_full','saving_early')),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  status public.request_status not null default 'pending',
  decided_by uuid references public.profiles(id),
  decision_note text,
  decided_at timestamptz,
  used_transaction_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  account_id uuid not null references public.customer_accounts(id),
  account_type public.account_type not null,
  transaction_type public.transaction_type not null,
  method public.money_method not null,
  amount numeric(14,2) not null check (amount > 0),
  balance_before numeric(14,2) not null check (balance_before >= 0),
  balance_after numeric(14,2) not null check (balance_after >= 0),
  note text,
  manager_id uuid references public.profiles(id),
  manager_period_id uuid references public.manager_periods(id),
  withdrawal_request_id uuid references public.withdrawal_requests(id),
  reversal_of uuid references public.transactions(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cash_conversions (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references public.profiles(id),
  manager_period_id uuid references public.manager_periods(id),
  from_method public.money_method not null,
  to_method public.money_method not null,
  amount numeric(14,2) not null check (amount > 0),
  note text,
  liquid_balance_after numeric(14,2) not null,
  online_balance_after numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint conversion_methods_different check (from_method <> to_method)
);

create table if not exists public.income_transactions (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('credit','debit')),
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  method public.money_method not null,
  note text,
  manager_id uuid references public.profiles(id),
  manager_period_id uuid references public.manager_periods(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.account_opening_charges (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  account_id uuid references public.customer_accounts(id),
  account_type public.account_type not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  income_transaction_id uuid references public.income_transactions(id),
  created_at timestamptz not null default now()
);

create table if not exists public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  manager_period_id uuid references public.manager_periods(id),
  generated_by uuid references public.profiles(id),
  storage_path text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.prevent_transaction_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Transactions are immutable. Create a reversal transaction instead.';
end $$;

drop trigger if exists transactions_no_update on public.transactions;
drop trigger if exists transactions_no_delete on public.transactions;
create trigger transactions_no_update before update on public.transactions for each row execute function public.prevent_transaction_mutation();
create trigger transactions_no_delete before delete on public.transactions for each row execute function public.prevent_transaction_mutation();

create or replace function public.jwt_role()
returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '');
$$;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager_or_head()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.jwt_role() = 'service_role', false) or exists (
    select 1 from public.profiles where id = auth.uid() and role in ('manager','head')
  );
$$;

create or replace function public.is_head()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'head');
$$;

create or replace function public.active_period_id()
returns uuid language sql stable as $$
  select id from public.manager_periods where is_active = true limit 1;
$$;

create or replace function public.notify_user(p_recipient uuid, p_title text, p_body text, p_link text default null, p_actor uuid default auth.uid())
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(recipient_id, actor_id, title, body, link)
  values (p_recipient, p_actor, p_title, p_body, p_link);
end $$;

create or replace function public.log_audit(p_action text, p_table text default null, p_entity uuid default null, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), p_action, p_table, p_entity, p_metadata);
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'customer';
  v_cic text;
begin
  if lower(new.email) = 'cbsmasapmsa@gmail.com' then
    v_role := 'manager';
    v_cic := 'CBSMASAPMSA';
  elsif lower(new.email) = 'administrator@pmsa.com' then
    v_role := 'head';
    v_cic := 'ADMINISTRATOR';
  else
    v_cic := upper(split_part(new.email, '@', 1));
  end if;

  insert into public.profiles(id, role, cic_no, customer_id, email, name, force_password_change)
  values (new.id, v_role, v_cic, case when v_role = 'customer' then 'CUST-' || v_cic else null end, new.email, new.raw_user_meta_data->>'name', v_role = 'customer')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.create_customer_profile_with_accounts(
  p_user_id uuid,
  p_cic_no text,
  p_name text,
  p_class_name text,
  p_phone text,
  p_email text,
  p_account_types public.account_type[],
  p_service_charge numeric default 0
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_type public.account_type;
  v_account_id uuid;
  v_income_id uuid;
begin
  if not (public.jwt_role() = 'service_role' or public.is_manager_or_head()) then
    raise exception 'Only manager/head can create customers.';
  end if;
  if p_service_charge < 0 then raise exception 'Service charge cannot be negative.'; end if;

  update public.profiles
  set role = 'customer', cic_no = upper(p_cic_no), customer_id = 'CUST-' || upper(p_cic_no), name = p_name,
      class_name = p_class_name, phone = p_phone, email = p_email, force_password_change = true
  where id = p_user_id;

  foreach v_type in array p_account_types loop
    insert into public.customer_accounts(customer_id, account_type)
    values (p_user_id, v_type)
    on conflict (customer_id, account_type) do nothing
    returning id into v_account_id;

    if p_service_charge > 0 and v_account_id is not null then
      insert into public.income_transactions(entry_type, category, amount, method, note, manager_id, manager_period_id)
      values ('credit', 'account_opening_service_charge', p_service_charge, 'liquid', 'Opening charge for ' || v_type, auth.uid(), public.active_period_id())
      returning id into v_income_id;
      insert into public.account_opening_charges(customer_id, account_id, account_type, amount, income_transaction_id)
      values (p_user_id, v_account_id, v_type, p_service_charge, v_income_id);
      update public.bank_cash_positions set liquid_balance = liquid_balance + p_service_charge, updated_at = now() where id = 1;
    end if;
  end loop;

  perform public.notify_user(p_user_id, 'Account opened', 'Your PMSA CBS account has been created.', '/customer');
  perform public.log_audit('customer.created', 'profiles', p_user_id, jsonb_build_object('cic_no', p_cic_no, 'accounts', p_account_types));
  return jsonb_build_object('customer_id', p_user_id);
end $$;

create or replace function public.open_customer_account(p_customer_id uuid, p_account_type public.account_type, p_service_charge numeric default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_account_id uuid;
  v_income_id uuid;
begin
  if not public.is_manager_or_head() then raise exception 'Only manager/head can open accounts.'; end if;
  if p_service_charge < 0 then raise exception 'Service charge cannot be negative.'; end if;

  insert into public.customer_accounts(customer_id, account_type)
  values (p_customer_id, p_account_type)
  returning id into v_account_id;

  if p_service_charge > 0 then
    insert into public.income_transactions(entry_type, category, amount, method, note, manager_id, manager_period_id)
    values ('credit', 'account_opening_service_charge', p_service_charge, 'liquid', 'Opening charge for ' || p_account_type, auth.uid(), public.active_period_id())
    returning id into v_income_id;
    insert into public.account_opening_charges(customer_id, account_id, account_type, amount, income_transaction_id)
    values (p_customer_id, v_account_id, p_account_type, p_service_charge, v_income_id);
    update public.bank_cash_positions set liquid_balance = liquid_balance + p_service_charge, updated_at = now() where id = 1;
  end if;

  perform public.notify_user(p_customer_id, 'Account opened', initcap(p_account_type::text) || ' account opened.', '/customer');
  perform public.log_audit('account.opened', 'customer_accounts', v_account_id, jsonb_build_object('account_type', p_account_type));
  return jsonb_build_object('account_id', v_account_id);
end $$;

create or replace function public.post_customer_transaction(
  p_customer_id uuid,
  p_account_type public.account_type,
  p_transaction_type public.transaction_type,
  p_method public.money_method,
  p_amount numeric,
  p_note text default null,
  p_withdrawal_request_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_account public.customer_accounts%rowtype;
  v_cash public.bank_cash_positions%rowtype;
  v_period uuid;
  v_balance_after numeric(14,2);
  v_txn_id uuid;
  v_requires_approval boolean := false;
  v_last_saving_debit timestamptz;
begin
  if public.current_user_role() <> 'manager' then raise exception 'Only bank manager can post customer transactions.'; end if;
  if p_transaction_type not in ('credit','debit') then raise exception 'Only credit/debit transactions are accepted here.'; end if;
  if p_amount <= 0 then raise exception 'Amount must be greater than zero.'; end if;

  select * into v_account from public.customer_accounts
  where customer_id = p_customer_id and account_type = p_account_type
  for update;
  if not found then raise exception 'Customer does not have an active % account.', p_account_type; end if;
  if v_account.status <> 'active' then raise exception 'Account is not active.'; end if;

  v_period := public.active_period_id();
  if v_period is null then raise exception 'No active manager period found.'; end if;

  select * into v_cash from public.bank_cash_positions where id = 1 for update;

  if p_transaction_type = 'debit' then
    if v_account.balance < p_amount then raise exception 'Insufficient customer account balance.'; end if;
    if p_method = 'liquid' and v_cash.liquid_balance < p_amount then raise exception 'Insufficient liquid balance in bank cash position.'; end if;
    if p_method = 'online' and v_cash.online_balance < p_amount then raise exception 'Insufficient online balance in bank cash position.'; end if;

    if p_account_type = 'fixed' then
      v_requires_approval := true;
    elsif p_account_type = 'saving' then
      select max(created_at) into v_last_saving_debit
      from public.transactions
      where customer_id = p_customer_id and account_type = 'saving' and transaction_type = 'debit'
        and date_trunc('month', created_at at time zone 'Asia/Kolkata') = date_trunc('month', now() at time zone 'Asia/Kolkata');
      if p_amount > (v_account.balance / 3) or v_last_saving_debit is not null or now() < v_account.opened_at + interval '1 month' or p_amount = v_account.balance then
        v_requires_approval := true;
      end if;
    end if;

    if v_requires_approval then
      if p_withdrawal_request_id is null then raise exception 'This withdrawal requires approved head request.'; end if;
      perform 1 from public.withdrawal_requests
      where id = p_withdrawal_request_id and customer_id = p_customer_id and account_id = v_account.id and status = 'approved' and amount >= p_amount;
      if not found then raise exception 'No matching approved withdrawal request found.'; end if;
    end if;
    v_balance_after := v_account.balance - p_amount;
  else
    v_balance_after := v_account.balance + p_amount;
  end if;

  insert into public.transactions(customer_id, account_id, account_type, transaction_type, method, amount, balance_before, balance_after, note, manager_id, manager_period_id, withdrawal_request_id)
  values (p_customer_id, v_account.id, p_account_type, p_transaction_type, p_method, p_amount, v_account.balance, v_balance_after, p_note, auth.uid(), v_period, p_withdrawal_request_id)
  returning id into v_txn_id;

  update public.customer_accounts set balance = v_balance_after where id = v_account.id;
  if p_transaction_type = 'credit' then
    update public.bank_cash_positions
    set liquid_balance = liquid_balance + case when p_method = 'liquid' then p_amount else 0 end,
        online_balance = online_balance + case when p_method = 'online' then p_amount else 0 end,
        updated_at = now()
    where id = 1;
    update public.manager_periods set total_credited = total_credited + p_amount, transaction_count = transaction_count + 1 where id = v_period;
  else
    update public.bank_cash_positions
    set liquid_balance = liquid_balance - case when p_method = 'liquid' then p_amount else 0 end,
        online_balance = online_balance - case when p_method = 'online' then p_amount else 0 end,
        updated_at = now()
    where id = 1;
    update public.manager_periods set total_debited = total_debited + p_amount, transaction_count = transaction_count + 1 where id = v_period;
  end if;

  if p_withdrawal_request_id is not null then
    update public.withdrawal_requests set status = 'used', used_transaction_id = v_txn_id where id = p_withdrawal_request_id;
  end if;

  perform public.notify_user(p_customer_id, 'Transaction posted', initcap(p_transaction_type::text) || ' of ₹' || p_amount || ' in ' || p_account_type || ' account.', '/customer');
  perform public.log_audit('transaction.posted', 'transactions', v_txn_id, jsonb_build_object('amount', p_amount, 'method', p_method, 'type', p_transaction_type));
  return jsonb_build_object('transaction_id', v_txn_id, 'account_balance', v_balance_after);
end $$;

create or replace function public.convert_bank_cash(p_from_method public.money_method, p_to_method public.money_method, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cash public.bank_cash_positions%rowtype;
  v_period uuid := public.active_period_id();
begin
  if public.current_user_role() <> 'manager' then raise exception 'Only manager can convert cash method balances.'; end if;
  if p_from_method = p_to_method then raise exception 'Choose different conversion methods.'; end if;
  if p_amount <= 0 then raise exception 'Amount must be greater than zero.'; end if;
  select * into v_cash from public.bank_cash_positions where id = 1 for update;
  if p_from_method = 'liquid' and v_cash.liquid_balance < p_amount then raise exception 'Insufficient liquid balance.'; end if;
  if p_from_method = 'online' and v_cash.online_balance < p_amount then raise exception 'Insufficient online balance.'; end if;

  update public.bank_cash_positions
  set liquid_balance = liquid_balance + case when p_to_method = 'liquid' then p_amount when p_from_method = 'liquid' then -p_amount else 0 end,
      online_balance = online_balance + case when p_to_method = 'online' then p_amount when p_from_method = 'online' then -p_amount else 0 end,
      updated_at = now()
  where id = 1
  returning * into v_cash;

  insert into public.cash_conversions(manager_id, manager_period_id, from_method, to_method, amount, note, liquid_balance_after, online_balance_after)
  values (auth.uid(), v_period, p_from_method, p_to_method, p_amount, p_note, v_cash.liquid_balance, v_cash.online_balance);
  perform public.log_audit('cash.converted', 'cash_conversions', null, jsonb_build_object('amount', p_amount, 'from', p_from_method, 'to', p_to_method));
  return jsonb_build_object('liquid_balance', v_cash.liquid_balance, 'online_balance', v_cash.online_balance);
end $$;

create or replace function public.post_income_transaction(p_entry_type text, p_category text, p_amount numeric, p_method public.money_method, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cash public.bank_cash_positions%rowtype;
  v_id uuid;
  v_period uuid := public.active_period_id();
begin
  if public.current_user_role() <> 'manager' then raise exception 'Only manager can update income ledger.'; end if;
  if p_entry_type not in ('credit','debit') then raise exception 'Income type must be credit or debit.'; end if;
  if p_amount <= 0 then raise exception 'Amount must be greater than zero.'; end if;
  select * into v_cash from public.bank_cash_positions where id = 1 for update;
  if p_entry_type = 'debit' then
    if p_method = 'liquid' and v_cash.liquid_balance < p_amount then raise exception 'Insufficient liquid balance.'; end if;
    if p_method = 'online' and v_cash.online_balance < p_amount then raise exception 'Insufficient online balance.'; end if;
  end if;

  insert into public.income_transactions(entry_type, category, amount, method, note, manager_id, manager_period_id)
  values (p_entry_type, p_category, p_amount, p_method, p_note, auth.uid(), v_period)
  returning id into v_id;
  update public.bank_cash_positions
  set liquid_balance = liquid_balance + case when p_method = 'liquid' then case when p_entry_type = 'credit' then p_amount else -p_amount end else 0 end,
      online_balance = online_balance + case when p_method = 'online' then case when p_entry_type = 'credit' then p_amount else -p_amount end else 0 end,
      updated_at = now()
  where id = 1;
  update public.manager_periods
  set income_credited = income_credited + case when p_entry_type = 'credit' then p_amount else 0 end,
      income_debited = income_debited + case when p_entry_type = 'debit' then p_amount else 0 end
  where id = v_period;
  perform public.log_audit('income.posted', 'income_transactions', v_id, jsonb_build_object('amount', p_amount, 'type', p_entry_type));
  return jsonb_build_object('income_transaction_id', v_id);
end $$;

create or replace function public.submit_withdrawal_request(p_account_id uuid, p_request_type text, p_amount numeric, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_account public.customer_accounts%rowtype;
  v_id uuid;
begin
  if public.current_user_role() <> 'customer' then raise exception 'Only customer can submit withdrawal request.'; end if;
  select * into v_account from public.customer_accounts where id = p_account_id and customer_id = auth.uid();
  if not found then raise exception 'Account not found.'; end if;
  if v_account.account_type = 'current' then raise exception 'Current account withdrawals do not need approval.'; end if;
  if p_amount <= 0 or p_amount > v_account.balance then raise exception 'Requested amount is invalid for available balance.'; end if;
  insert into public.withdrawal_requests(customer_id, account_id, request_type, amount, reason)
  values (auth.uid(), p_account_id, p_request_type, p_amount, p_reason)
  returning id into v_id;
  insert into public.notifications(recipient_id, actor_id, title, body, link)
  select id, auth.uid(), 'Withdrawal request submitted', 'A student submitted a restricted withdrawal request.', '/head/requests'
  from public.profiles where role = 'head';
  perform public.log_audit('withdrawal.requested', 'withdrawal_requests', v_id, jsonb_build_object('amount', p_amount));
  return jsonb_build_object('request_id', v_id);
end $$;

create or replace function public.decide_withdrawal_request(p_request_id uuid, p_decision text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_request public.withdrawal_requests%rowtype;
begin
  if not public.is_head() then raise exception 'Only head can decide withdrawal requests.'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.'; end if;
  select * into v_request from public.withdrawal_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if v_request.status <> 'pending' then raise exception 'Only pending requests can be decided.'; end if;
  update public.withdrawal_requests
  set status = p_decision::public.request_status, decided_by = auth.uid(), decision_note = p_note, decided_at = now()
  where id = p_request_id;
  perform public.notify_user(v_request.customer_id, 'Withdrawal request ' || p_decision, coalesce(p_note, 'Decision recorded.'), '/customer/withdrawals');
  perform public.log_audit('withdrawal.' || p_decision, 'withdrawal_requests', p_request_id, jsonb_build_object('note', p_note));
  return jsonb_build_object('request_id', p_request_id, 'status', p_decision);
end $$;

create or replace function public.handover_manager_period(p_new_manager_user_id uuid, p_new_period_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_old public.manager_periods%rowtype;
  v_cash public.bank_cash_positions%rowtype;
  v_report_id uuid;
  v_new_id uuid;
begin
  if not public.is_head() then raise exception 'Only head can complete manager handover.'; end if;
  select * into v_old from public.manager_periods where is_active = true for update;
  select * into v_cash from public.bank_cash_positions where id = 1 for update;

  if v_old.id is not null then
    insert into public.generated_reports(report_type, manager_period_id, generated_by, summary)
    values ('manager_handover_excel_backup', v_old.id, auth.uid(), jsonb_build_object(
      'manager_name', (select name from public.profiles where id = v_old.manager_user_id),
      'total_credited', v_old.total_credited,
      'total_debited', v_old.total_debited,
      'liquid_balance', v_cash.liquid_balance,
      'online_balance', v_cash.online_balance,
      'total_closing_balance', v_cash.liquid_balance + v_cash.online_balance,
      'income_credited', v_old.income_credited,
      'income_debited', v_old.income_debited,
      'transaction_count', v_old.transaction_count
    )) returning id into v_report_id;
    update public.manager_periods
    set is_active = false, ended_at = now(), closing_liquid_balance = v_cash.liquid_balance, closing_online_balance = v_cash.online_balance
    where id = v_old.id;
  end if;

  insert into public.manager_periods(name, manager_user_id, is_active, opening_liquid_balance, opening_online_balance)
  values (p_new_period_name, p_new_manager_user_id, true, v_cash.liquid_balance, v_cash.online_balance)
  returning id into v_new_id;

  insert into public.transactions(customer_id, account_id, account_type, transaction_type, method, amount, balance_before, balance_after, note, manager_id, manager_period_id)
  select customer_id, id, account_type, 'opening_balance', 'liquid', greatest(balance, 0.01), balance, balance, 'Opening balance carried to new manager period', p_new_manager_user_id, v_new_id
  from public.customer_accounts
  where status = 'active' and balance > 0;

  insert into public.notifications(recipient_id, actor_id, title, body, link)
  select id, auth.uid(), 'Manager handover completed', 'A new manager period has started: ' || p_new_period_name, '/manager'
  from public.profiles where role in ('manager','head');
  perform public.log_audit('manager.handover', 'manager_periods', v_new_id, jsonb_build_object('report_id', v_report_id));
  return jsonb_build_object('old_period_id', v_old.id, 'new_period_id', v_new_id, 'report_id', v_report_id);
end $$;

alter table public.profiles enable row level security;
alter table public.customer_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.bank_cash_positions enable row level security;
alter table public.cash_conversions enable row level security;
alter table public.manager_periods enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.income_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.fcm_tokens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.account_opening_charges enable row level security;
alter table public.generated_reports enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_manager_or_head());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists accounts_read on public.customer_accounts;
create policy accounts_read on public.customer_accounts for select using (customer_id = auth.uid() or public.is_manager_or_head());
drop policy if exists transactions_read on public.transactions;
create policy transactions_read on public.transactions for select using (customer_id = auth.uid() or public.is_manager_or_head());
drop policy if exists cash_read on public.bank_cash_positions;
create policy cash_read on public.bank_cash_positions for select using (public.is_manager_or_head());
drop policy if exists conversions_read on public.cash_conversions;
create policy conversions_read on public.cash_conversions for select using (public.is_manager_or_head());
drop policy if exists periods_read on public.manager_periods;
create policy periods_read on public.manager_periods for select using (public.is_manager_or_head());
drop policy if exists withdrawals_read on public.withdrawal_requests;
create policy withdrawals_read on public.withdrawal_requests for select using (customer_id = auth.uid() or public.is_manager_or_head());
drop policy if exists income_read on public.income_transactions;
create policy income_read on public.income_transactions for select using (public.is_manager_or_head());
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (recipient_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
drop policy if exists fcm_owner on public.fcm_tokens;
create policy fcm_owner on public.fcm_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select using (public.is_head());
drop policy if exists charges_read on public.account_opening_charges;
create policy charges_read on public.account_opening_charges for select using (customer_id = auth.uid() or public.is_manager_or_head());
drop policy if exists reports_read on public.generated_reports;
create policy reports_read on public.generated_reports for select using (public.is_manager_or_head());

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.customer_accounts, public.transactions, public.notifications to authenticated;
grant select on public.bank_cash_positions, public.cash_conversions, public.manager_periods, public.withdrawal_requests, public.income_transactions, public.audit_logs, public.account_opening_charges, public.generated_reports to authenticated;
grant insert, update on public.fcm_tokens to authenticated;
grant update on public.profiles, public.notifications to authenticated;
grant execute on function public.create_customer_profile_with_accounts(uuid,text,text,text,text,text,public.account_type[],numeric) to authenticated, service_role;
grant execute on function public.open_customer_account(uuid, public.account_type, numeric) to authenticated;
grant execute on function public.post_customer_transaction(uuid, public.account_type, public.transaction_type, public.money_method, numeric, text, uuid) to authenticated;
grant execute on function public.convert_bank_cash(public.money_method, public.money_method, numeric, text) to authenticated;
grant execute on function public.post_income_transaction(text, text, numeric, public.money_method, text) to authenticated;
grant execute on function public.submit_withdrawal_request(uuid, text, numeric, text) to authenticated;
grant execute on function public.decide_withdrawal_request(uuid, text, text) to authenticated;
grant execute on function public.handover_manager_period(uuid, text) to authenticated;

