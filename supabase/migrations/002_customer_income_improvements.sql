drop function if exists public.create_customer_profile_with_accounts(uuid,text,text,text,text,text,public.account_type[],numeric);
drop function if exists public.open_customer_account(uuid, public.account_type, numeric);

create or replace function public.prevent_transaction_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_transaction_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'Transactions are immutable. Create a reversal transaction instead.';
end $$;

create or replace function public.create_customer_profile_with_accounts(
  p_user_id uuid,
  p_cic_no text,
  p_name text,
  p_class_name text,
  p_phone text,
  p_email text,
  p_account_types public.account_type[],
  p_service_charge numeric default 20,
  p_service_charge_method public.money_method default 'liquid',
  p_opened_at timestamptz default now()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_type public.account_type;
  v_account_id uuid;
  v_income_id uuid;
  v_display_name text := coalesce(nullif(p_name, ''), upper(p_cic_no));
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
    insert into public.customer_accounts(customer_id, account_type, opened_at)
    values (p_user_id, v_type, coalesce(p_opened_at, now()))
    on conflict (customer_id, account_type) do nothing
    returning id into v_account_id;

    if p_service_charge > 0 and v_account_id is not null then
      insert into public.income_transactions(entry_type, category, amount, method, note, manager_id, manager_period_id, created_at)
      values ('credit', 'Service Charge', p_service_charge, p_service_charge_method, 'Opening charge of ' || v_type || ' account for ' || v_display_name, auth.uid(), public.active_period_id(), coalesce(p_opened_at, now()))
      returning id into v_income_id;
      insert into public.account_opening_charges(customer_id, account_id, account_type, amount, income_transaction_id, created_at)
      values (p_user_id, v_account_id, v_type, p_service_charge, v_income_id, coalesce(p_opened_at, now()));
      update public.bank_cash_positions
      set liquid_balance = liquid_balance + case when p_service_charge_method = 'liquid' then p_service_charge else 0 end,
          online_balance = online_balance + case when p_service_charge_method = 'online' then p_service_charge else 0 end,
          updated_at = now()
      where id = 1;
    end if;
  end loop;

  perform public.notify_user(p_user_id, 'Account opened', 'Your PMSA CBS account has been created.', '/customer');
  perform public.log_audit('customer.created', 'profiles', p_user_id, jsonb_build_object('cic_no', p_cic_no, 'accounts', p_account_types));
  return jsonb_build_object('customer_id', p_user_id);
exception
  when unique_violation then
    raise exception 'A customer with this CIC number or email already exists.';
end $$;

create or replace function public.open_customer_account(
  p_customer_id uuid,
  p_account_type public.account_type,
  p_service_charge numeric default 20,
  p_service_charge_method public.money_method default 'liquid',
  p_opened_at timestamptz default now()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_account_id uuid;
  v_income_id uuid;
  v_display_name text;
begin
  if not public.is_manager_or_head() then raise exception 'Only manager/head can open accounts.'; end if;
  if p_service_charge < 0 then raise exception 'Service charge cannot be negative.'; end if;
  if exists (select 1 from public.customer_accounts where customer_id = p_customer_id and account_type = p_account_type) then
    select coalesce(name, cic_no) into v_display_name from public.profiles where id = p_customer_id;
    raise exception '% already has a % account.', coalesce(v_display_name, 'This customer'), p_account_type;
  end if;

  select coalesce(name, cic_no) into v_display_name from public.profiles where id = p_customer_id;
  insert into public.customer_accounts(customer_id, account_type, opened_at)
  values (p_customer_id, p_account_type, coalesce(p_opened_at, now()))
  returning id into v_account_id;

  if p_service_charge > 0 then
    insert into public.income_transactions(entry_type, category, amount, method, note, manager_id, manager_period_id, created_at)
    values ('credit', 'Service Charge', p_service_charge, p_service_charge_method, 'Opening charge of ' || p_account_type || ' account for ' || coalesce(v_display_name, 'customer'), auth.uid(), public.active_period_id(), coalesce(p_opened_at, now()))
    returning id into v_income_id;
    insert into public.account_opening_charges(customer_id, account_id, account_type, amount, income_transaction_id, created_at)
    values (p_customer_id, v_account_id, p_account_type, p_service_charge, v_income_id, coalesce(p_opened_at, now()));
    update public.bank_cash_positions
    set liquid_balance = liquid_balance + case when p_service_charge_method = 'liquid' then p_service_charge else 0 end,
        online_balance = online_balance + case when p_service_charge_method = 'online' then p_service_charge else 0 end,
        updated_at = now()
    where id = 1;
  end if;

  perform public.notify_user(p_customer_id, 'Account opened', initcap(p_account_type::text) || ' account opened.', '/customer');
  perform public.log_audit('account.opened', 'customer_accounts', v_account_id, jsonb_build_object('account_type', p_account_type));
  return jsonb_build_object('account_id', v_account_id);
end $$;

create or replace function public.update_customer_basic(p_customer_id uuid, p_name text, p_class_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager_or_head() then raise exception 'Only manager/head can edit customer details.'; end if;
  update public.profiles
  set name = p_name, class_name = p_class_name
  where id = p_customer_id and role = 'customer';
  if not found then raise exception 'Customer not found.'; end if;
  perform public.log_audit('customer.updated', 'profiles', p_customer_id, jsonb_build_object('name', p_name, 'class_name', p_class_name));
  return jsonb_build_object('customer_id', p_customer_id);
end $$;

create or replace function public.bulk_update_customer_class(p_from_class text, p_to_class text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if not public.is_manager_or_head() then raise exception 'Only manager/head can bulk convert classes.'; end if;
  if p_from_class = p_to_class then raise exception 'Choose different classes.'; end if;
  update public.profiles set class_name = p_to_class where role = 'customer' and class_name = p_from_class;
  get diagnostics v_count = row_count;
  perform public.log_audit('customer.bulk_class_update', 'profiles', null, jsonb_build_object('from', p_from_class, 'to', p_to_class, 'count', v_count));
  return jsonb_build_object('updated', v_count);
end $$;

create or replace function public.delete_customer_if_zero(p_customer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_balance numeric(14,2);
  v_name text;
begin
  if not public.is_manager_or_head() then raise exception 'Only manager/head can delete customers.'; end if;
  select coalesce(sum(balance), 0) into v_balance from public.customer_accounts where customer_id = p_customer_id;
  if v_balance <> 0 then
    raise exception 'This customer still has ₹% in account balance. Delete is allowed only when balance is zero.', v_balance;
  end if;
  select coalesce(name, cic_no, 'customer') into v_name from public.profiles where id = p_customer_id and role = 'customer';
  if v_name is null then raise exception 'Customer not found.'; end if;

  update public.income_transactions it
  set note = 'Opening charge for customer is deleted'
  from public.account_opening_charges aoc
  where aoc.income_transaction_id = it.id and aoc.customer_id = p_customer_id;

  perform set_config('app.allow_transaction_delete', 'on', true);
  delete from public.account_opening_charges where customer_id = p_customer_id;
  delete from public.withdrawal_requests where customer_id = p_customer_id;
  delete from public.transactions where customer_id = p_customer_id;
  delete from public.customer_accounts where customer_id = p_customer_id;
  delete from public.notifications where recipient_id = p_customer_id or actor_id = p_customer_id;
  delete from public.fcm_tokens where user_id = p_customer_id;
  delete from public.audit_logs where actor_id = p_customer_id;
  delete from public.profiles where id = p_customer_id and role = 'customer';

  perform public.log_audit('customer.deleted', 'profiles', p_customer_id, jsonb_build_object('customer', v_name));
  return jsonb_build_object('deleted_customer_id', p_customer_id);
end $$;

grant execute on function public.create_customer_profile_with_accounts(uuid,text,text,text,text,text,public.account_type[],numeric,public.money_method,timestamptz) to authenticated, service_role;
grant execute on function public.open_customer_account(uuid, public.account_type, numeric, public.money_method, timestamptz) to authenticated;
grant execute on function public.update_customer_basic(uuid, text, text) to authenticated;
grant execute on function public.bulk_update_customer_class(text, text) to authenticated;
grant execute on function public.delete_customer_if_zero(uuid) to authenticated;
