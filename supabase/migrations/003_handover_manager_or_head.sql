create or replace function public.handover_manager_period(p_new_manager_user_id uuid, p_new_period_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_old public.manager_periods%rowtype;
  v_cash public.bank_cash_positions%rowtype;
  v_report_id uuid;
  v_new_id uuid;
begin
  if not public.is_manager_or_head() then raise exception 'Only manager/head can complete manager handover.'; end if;
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

grant execute on function public.handover_manager_period(uuid, text) to authenticated;

