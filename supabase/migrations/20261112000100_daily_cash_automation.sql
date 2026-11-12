alter table public.il_mundo_profiles
  drop constraint if exists il_mundo_profiles_role_check;

alter table public.il_mundo_profiles
  add constraint il_mundo_profiles_role_check
  check (role in ('admin', 'cashier', 'worker'));

create or replace function public.il_mundo_current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.role = 'cashier' then 'worker' else p.role end
  from public.il_mundo_profiles p
  where p.user_id = (select auth.uid())
$$;

drop policy if exists "Admins can read cash workspace state" on public.il_mundo_cash_state;
create policy "Admins and cashiers can read cash workspace state"
  on public.il_mundo_cash_state for select to authenticated
  using (
    (select public.il_mundo_current_role()) = 'admin'
    or exists (
      select 1
      from public.il_mundo_profiles p
      where p.user_id = (select auth.uid())
        and p.role = 'cashier'
    )
  );

create table if not exists public.il_mundo_daily_report_jobs (
  report_date date primary key,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.il_mundo_daily_report_jobs enable row level security;
revoke all on public.il_mundo_daily_report_jobs from anon, authenticated;

create or replace function public.il_mundo_auto_open_cash()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local_now timestamp := clock_timestamp() at time zone 'America/La_Paz';
  v_today date := v_local_now::date;
  v_data jsonb;
  v_sessions jsonb;
  v_updated_sessions jsonb;
  v_opened_at timestamptz := (v_today + time '00:01') at time zone 'America/La_Paz';
  v_changed boolean := false;
begin
  if auth.uid() is not null and coalesce(public.il_mundo_current_role(), '') not in ('admin', 'worker') then
    raise exception 'La cuenta no puede asegurar la apertura de caja.';
  end if;
  if v_local_now::time < time '00:01' or v_local_now::time >= time '23:59' then
    return false;
  end if;

  perform 1 from public.il_mundo_state where id = 1 for update;
  if not found then
    raise exception 'El espacio compartido todavía no fue inicializado.';
  end if;

  select c.data into v_data
  from public.il_mundo_cash_state c
  where c.id = 1
  for update;
  if not found then
    raise exception 'El estado de caja todavía no fue inicializado.';
  end if;

  v_sessions := coalesce(v_data -> 'cashSessions', '[]'::jsonb);

  select coalesce(jsonb_agg(
    case
      when session.value ->> 'closedAt' is null
       and session.value ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$'
       and (session.value ->> 'date')::date < v_today
      then session.value || jsonb_build_object(
        'closedAt', ((session.value ->> 'date')::date + time '23:59') at time zone 'America/La_Paz',
        'countedAmount', null,
        'closingNotes', 'Cierre automático por cambio de día; sin arqueo físico.'
      )
      else session.value
    end
    order by session.ordinality
  ), '[]'::jsonb)
  into v_updated_sessions
  from jsonb_array_elements(v_sessions) with ordinality as session(value, ordinality);

  if not exists (
    select 1
    from jsonb_array_elements(v_updated_sessions) as session(value)
    where session.value ->> 'date' = v_today::text
      and session.value ->> 'closedAt' is null
  ) then
    v_updated_sessions := v_updated_sessions || jsonb_build_array(jsonb_build_object(
      'id', 'auto-' || v_today::text,
      'date', v_today::text,
      'openingAmount', 0,
      'openedAt', v_opened_at,
      'openedBy', 'automatic',
      'transactions', '[]'::jsonb,
      'closedAt', null
    ));
    v_changed := true;
  end if;

  if v_updated_sessions is distinct from v_sessions then
    v_changed := true;
    update public.il_mundo_cash_state
    set data = jsonb_set(coalesce(v_data, '{"cashSessions":[]}'::jsonb), '{cashSessions}', v_updated_sessions, true),
        updated_at = now()
    where id = 1;
    update public.il_mundo_state
    set revision = revision + 1, updated_at = now()
    where id = 1;
  end if;

  return v_changed;
end;
$$;

create or replace function public.il_mundo_ensure_cash_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.il_mundo_current_role() is null then
    raise exception 'Inicia sesión con una cuenta válida para cargar la caja.';
  end if;
  return public.il_mundo_auto_open_cash();
end;
$$;

create or replace function public.il_mundo_auto_close_cash(p_report_date date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_sessions jsonb;
  v_closed_sessions jsonb;
  v_closed_at timestamptz := (p_report_date + time '23:59') at time zone 'America/La_Paz';
begin
  if p_report_date is null then
    raise exception 'La fecha del cierre es obligatoria.';
  end if;

  perform 1 from public.il_mundo_state where id = 1 for update;
  if not found then
    raise exception 'El espacio compartido todavía no fue inicializado.';
  end if;

  select c.data into v_data
  from public.il_mundo_cash_state c
  where c.id = 1
  for update;
  if not found then
    raise exception 'El estado de caja todavía no fue inicializado.';
  end if;

  v_sessions := coalesce(v_data -> 'cashSessions', '[]'::jsonb);
  select coalesce(jsonb_agg(
    case
      when session.value ->> 'date' = p_report_date::text
       and session.value ->> 'closedAt' is null
      then session.value || jsonb_build_object(
        'closedAt', v_closed_at,
        'countedAmount', null,
        'closingNotes', 'Cierre automático; sin arqueo físico.'
      )
      else session.value
    end
    order by session.ordinality
  ), '[]'::jsonb)
  into v_closed_sessions
  from jsonb_array_elements(v_sessions) with ordinality as session(value, ordinality);

  if v_closed_sessions is not distinct from v_sessions then
    return false;
  end if;

  update public.il_mundo_cash_state
  set data = jsonb_set(coalesce(v_data, '{"cashSessions":[]}'::jsonb), '{cashSessions}', v_closed_sessions, true),
      updated_at = now()
  where id = 1;
  update public.il_mundo_state
  set revision = revision + 1, updated_at = now()
  where id = 1;
  return true;
end;
$$;

create or replace function public.il_mundo_require_open_cash_for_new_orders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(coalesce(new.data -> 'orders', '[]'::jsonb)) as current_order(value)
    where current_order.value ->> 'date' = (now() at time zone 'America/La_Paz')::date::text
      and current_order.value ->> 'status' = 'new'
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(old.data -> 'orders', '[]'::jsonb)) as previous_order(value)
        where previous_order.value ->> 'id' = current_order.value ->> 'id'
      )
  ) and not exists (
    select 1
    from public.il_mundo_cash_state cash,
      jsonb_array_elements(coalesce(cash.data -> 'cashSessions', '[]'::jsonb)) as cash_session(value)
    where cash.id = 1
      and cash_session.value ->> 'date' = (now() at time zone 'America/La_Paz')::date::text
      and cash_session.value ->> 'closedAt' is null
  ) then
    raise exception 'La caja está cerrada. Los pedidos pagados solo se registran dentro del horario de caja.';
  end if;
  return new;
end;
$$;

drop trigger if exists il_mundo_require_open_cash_for_new_orders on public.il_mundo_state;
create trigger il_mundo_require_open_cash_for_new_orders
  before update of data on public.il_mundo_state
  for each row execute function public.il_mundo_require_open_cash_for_new_orders();

create or replace function public.il_mundo_claim_daily_report(p_report_date date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Solo el servicio de reportes puede reclamar un balance.';
  end if;
  insert into public.il_mundo_daily_report_jobs (report_date)
  values (p_report_date)
  on conflict (report_date) do nothing;

  update public.il_mundo_daily_report_jobs
  set status = 'sending',
      attempts = attempts + 1,
      claimed_at = now(),
      last_error = null,
      updated_at = now()
  where report_date = p_report_date
    and status <> 'sent'
    and (status <> 'sending' or claimed_at < now() - interval '10 minutes')
  returning true into v_claimed;
  return coalesce(v_claimed, false);
end;
$$;

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

create or replace function public.il_mundo_complete_daily_report(p_report_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Solo el servicio de reportes puede confirmar un balance.';
  end if;
  update public.il_mundo_daily_report_jobs
  set status = 'sent', claimed_at = null, sent_at = now(), last_error = null, updated_at = now()
  where report_date = p_report_date;
  if not found then
    raise exception 'No se encontró el balance diario reclamado.';
  end if;
end;
$$;

drop function if exists public.il_mundo_prune_old_history();

revoke all on function public.il_mundo_auto_open_cash() from public, anon;
revoke all on function public.il_mundo_ensure_cash_session() from public, anon;
revoke all on function public.il_mundo_auto_close_cash(date) from public, anon, authenticated;
revoke all on function public.il_mundo_claim_daily_report(date) from public, anon, authenticated;
revoke all on function public.il_mundo_fail_daily_report(date, text) from public, anon, authenticated;
revoke all on function public.il_mundo_complete_daily_report(date) from public, anon, authenticated;
grant execute on function public.il_mundo_auto_open_cash() to authenticated, service_role;
grant execute on function public.il_mundo_ensure_cash_session() to authenticated;
grant execute on function public.il_mundo_auto_close_cash(date) to service_role;
grant execute on function public.il_mundo_claim_daily_report(date) to service_role;
grant execute on function public.il_mundo_fail_daily_report(date, text) to service_role;
grant execute on function public.il_mundo_complete_daily_report(date) to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.il_mundo_invoke_daily_balance_report()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_cron_secret text;
  v_anon_key text;
begin
  select secret.decrypted_secret into v_project_url
  from vault.decrypted_secrets secret
  where secret.name = 'il_mundo_project_url';
  select secret.decrypted_secret into v_cron_secret
  from vault.decrypted_secrets secret
  where secret.name = 'il_mundo_cron_secret';
  select secret.decrypted_secret into v_anon_key
  from vault.decrypted_secrets secret
  where secret.name = 'il_mundo_anon_key';
  if coalesce(v_project_url, '') = '' or coalesce(v_cron_secret, '') = '' or coalesce(v_anon_key, '') = '' then
    raise exception 'Configura il_mundo_project_url, il_mundo_cron_secret y il_mundo_anon_key en Supabase Vault.';
  end if;
  perform net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/daily-balance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_cron_secret,
      'apikey', v_anon_key
    ),
    body := '{"task":"daily-balance"}'::jsonb
  );
end;
$$;

create or replace function public.il_mundo_schedule_daily_balance_jobs()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_cron_secret text;
  v_anon_key text;
  v_job_id bigint;
  v_email_ready boolean;
begin
  select secret.decrypted_secret into v_project_url
  from vault.decrypted_secrets secret
  where secret.name = 'il_mundo_project_url';
  select secret.decrypted_secret into v_cron_secret
  from vault.decrypted_secrets secret
  where secret.name = 'il_mundo_cron_secret';
  select secret.decrypted_secret into v_anon_key
  from vault.decrypted_secrets secret
  where secret.name = 'il_mundo_anon_key';
  v_email_ready := coalesce(v_project_url, '') <> ''
    and coalesce(v_cron_secret, '') <> ''
    and coalesce(v_anon_key, '') <> '';

  for v_job_id in
    select job.jobid
    from cron.job job
    where job.jobname in (
      'il-mundo-open-cash',
      'il-mundo-close-cash',
      'il-mundo-daily-report',
      'il-mundo-daily-report-retry-1',
      'il-mundo-daily-report-retry-2'
    )
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'il-mundo-open-cash',
    '1 4 * * *',
    'select public.il_mundo_auto_open_cash();'
  );
  perform cron.schedule(
    'il-mundo-close-cash',
    '59 3 * * *',
    'select public.il_mundo_auto_close_cash((now() at time zone ''America/La_Paz'')::date);'
  );
  if not v_email_ready then
    return false;
  end if;
  perform cron.schedule(
    'il-mundo-daily-report',
    '5 4 * * *',
    'select public.il_mundo_invoke_daily_balance_report();'
  );
  perform cron.schedule(
    'il-mundo-daily-report-retry-1',
    '20 4 * * *',
    'select public.il_mundo_invoke_daily_balance_report();'
  );
  perform cron.schedule(
    'il-mundo-daily-report-retry-2',
    '35 4 * * *',
    'select public.il_mundo_invoke_daily_balance_report();'
  );
  return true;
end;
$$;

revoke all on function public.il_mundo_invoke_daily_balance_report() from public, anon, authenticated;
revoke all on function public.il_mundo_schedule_daily_balance_jobs() from public, anon, authenticated;
grant execute on function public.il_mundo_schedule_daily_balance_jobs() to service_role;

select public.il_mundo_schedule_daily_balance_jobs();
