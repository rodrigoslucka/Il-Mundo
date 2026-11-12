create or replace function public.il_mundo_fail_daily_report(p_report_date date, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Solo el servicio de reportes puede actualizar un balance.';
  end if;
  update public.il_mundo_daily_report_jobs
  set status = 'failed',
      claimed_at = null,
      last_error = left(coalesce(p_error, 'Error no especificado.'), 1000),
      updated_at = now()
  where report_date = p_report_date
    and status <> 'sent';
end;
$$;

revoke all on function public.il_mundo_create_profile() from public, anon, authenticated;
revoke all on function public.il_mundo_current_role() from public, anon;
grant execute on function public.il_mundo_current_role() to authenticated;
revoke all on function public.il_mundo_require_open_cash_for_new_orders() from public, anon, authenticated;
