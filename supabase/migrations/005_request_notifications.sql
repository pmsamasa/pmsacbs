create or replace function public.decide_withdrawal_request(p_request_id uuid, p_decision text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_customer_name text;
begin
  if not public.is_head() then raise exception 'Only head can decide withdrawal requests.'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.'; end if;
  select * into v_request from public.withdrawal_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if v_request.status <> 'pending' then raise exception 'Only pending requests can be decided.'; end if;

  select coalesce(name, cic_no, 'Customer') into v_customer_name from public.profiles where id = v_request.customer_id;

  update public.withdrawal_requests
  set status = p_decision::public.request_status, decided_by = auth.uid(), decision_note = p_note, decided_at = now()
  where id = p_request_id;

  perform public.notify_user(
    v_request.customer_id,
    'Withdrawal request ' || p_decision,
    case when p_decision = 'approved'
      then 'Your withdrawal request was approved. Approval ID: ' || p_request_id
      else coalesce(p_note, 'Your withdrawal request was rejected.')
    end,
    '/customer/withdrawals'
  );

  if p_decision = 'approved' then
    insert into public.notifications(recipient_id, actor_id, title, body, link)
    select id, auth.uid(), 'Withdrawal request approved',
      v_customer_name || ' has an approved request. Approval ID: ' || p_request_id || '. Touch/copy this ID on the requests page before posting the restricted debit.',
      '/manager/requests'
    from public.profiles where role = 'manager';
  end if;

  perform public.log_audit('withdrawal.' || p_decision, 'withdrawal_requests', p_request_id, jsonb_build_object('note', p_note));
  return jsonb_build_object('request_id', p_request_id, 'status', p_decision);
end $$;

grant execute on function public.decide_withdrawal_request(uuid, text, text) to authenticated;

