create or replace function public.send_manager_broadcast_notification(
  p_title text,
  p_body text,
  p_message_date timestamptz default now()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if public.current_user_role() <> 'manager' then
    raise exception 'Only bank manager can send customer broadcast alerts.';
  end if;
  if length(trim(p_title)) < 2 or length(trim(p_body)) < 3 then
    raise exception 'Alert heading and details are required.';
  end if;

  insert into public.notifications(recipient_id, actor_id, title, body, link, created_at)
  select id, auth.uid(), trim(p_title), trim(p_body) || E'\n\nConfirmed by bank manager.', '/notifications', coalesce(p_message_date, now())
  from public.profiles
  where role = 'customer';

  get diagnostics v_count = row_count;
  perform public.log_audit('notification.broadcast', 'notifications', null, jsonb_build_object('title', p_title, 'customers', v_count));
  return jsonb_build_object('sent', v_count);
end $$;

grant execute on function public.send_manager_broadcast_notification(text, text, timestamptz) to authenticated;

