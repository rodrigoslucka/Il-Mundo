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
  if auth.uid() is not null and coalesce(public.il_mundo_current_role(), '') not in ('admin', 'cashier', 'worker') then
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
