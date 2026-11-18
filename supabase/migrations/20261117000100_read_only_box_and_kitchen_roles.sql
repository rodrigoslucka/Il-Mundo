create or replace function public.il_mundo_current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.il_mundo_profiles p
  where p.user_id = (select auth.uid())
$$;

revoke all on function public.il_mundo_current_role() from public, anon;
grant execute on function public.il_mundo_current_role() to authenticated;

create or replace function public.il_mundo_save(
  p_state jsonb,
  p_cash_state jsonb,
  p_expected_revision bigint
)
returns table (state jsonb, cash_state jsonb, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.il_mundo_current_role();
  v_current jsonb;
  v_cash jsonb;
  v_revision bigint;
  v_order jsonb;
  v_old_order jsonb;
  v_sessions jsonb;
  v_new_orders jsonb := '[]'::jsonb;
  v_state_orders jsonb;
  v_order_index integer;
  v_now timestamptz := clock_timestamp();
  v_business_date text;
begin
  v_business_date := (v_now at time zone 'America/La_Paz')::date::text;
  select s.data, s.revision
  into v_current, v_revision
  from public.il_mundo_state s
  where s.id = 1
  for update;

  if not found then
    raise exception 'El espacio de trabajo todavía no fue inicializado.';
  end if;
  if v_revision <> p_expected_revision then
    raise exception 'CONFLICT: el espacio de trabajo cambió en otro dispositivo.';
  end if;

  if v_role is distinct from 'admin' and v_role is distinct from 'cashier' then
    raise exception 'Solo el administrador o Caja pueden modificar el espacio de trabajo.';
  end if;

  if v_role = 'cashier' then
    if (p_state - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team')
       is distinct from
       (v_current - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team') then
      raise exception 'Caja solo puede crear pedidos.';
    end if;
    if jsonb_typeof(p_state -> 'orders') <> 'array'
       or jsonb_array_length(p_state -> 'orders') < jsonb_array_length(coalesce(v_current -> 'orders', '[]'::jsonb)) then
      raise exception 'Caja no puede borrar ni modificar pedidos existentes.';
    end if;

    for v_old_order in
      select value from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb))
    loop
      select value into v_order
      from jsonb_array_elements(p_state -> 'orders')
      where value ->> 'id' = v_old_order ->> 'id'
      limit 1;
      if v_order is null or v_order is distinct from v_old_order then
        raise exception 'Caja no puede modificar pedidos existentes.';
      end if;
    end loop;

    v_state_orders := p_state -> 'orders';
    for v_order, v_order_index in
      select value, (ordinality - 1)::integer
      from jsonb_array_elements(v_state_orders) with ordinality
    loop
      if not exists (
        select 1
        from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb)) old_order
        where old_order ->> 'id' = v_order ->> 'id'
      ) then
        if not public.il_mundo_order_is_valid(v_order, v_current, (select auth.uid())) then
          raise exception 'El nuevo pedido no cumple los requisitos de creación.';
        end if;
        if coalesce(v_order ->> 'deliveryPersonId', '') <> '' then
          raise exception 'Caja no puede asignar repartidores a los pedidos.';
        end if;
        v_order := jsonb_set(v_order, '{date}', to_jsonb(v_business_date), true);
        v_order := jsonb_set(v_order, '{createdAt}', to_jsonb(v_now), true);
        v_order := jsonb_set(v_order, '{createdBy}', to_jsonb((select auth.uid())::text), true);
        v_order := jsonb_set(v_order, '{payment,paidAt}', to_jsonb(v_now), true);
        v_state_orders := jsonb_set(v_state_orders, array[v_order_index::text], v_order, true);
        v_new_orders := v_new_orders || jsonb_build_array(v_order);
      end if;
    end loop;
    p_state := jsonb_set(p_state, '{orders}', v_state_orders, true);

    if exists (
      select 1
      from jsonb_array_elements(p_state -> 'orders') as orders(value)
      group by value ->> 'id'
      having value ->> 'id' is null or count(*) > 1
    ) then
      raise exception 'Cada pedido debe tener un identificador único.';
    end if;

    select coalesce(jsonb_agg(
      case
        when session ->> 'closedAt' is null then
          jsonb_set(
            session,
            '{transactions}',
            coalesce(session -> 'transactions', '[]'::jsonb) ||
            coalesce((
              select jsonb_agg(jsonb_build_object(
                'orderId', new_order ->> 'id',
                'method', new_order #>> '{payment,method}',
                'amount', new_order #>> '{payment,amount}',
                'paidAt', new_order #>> '{payment,paidAt}'
              ))
              from jsonb_array_elements(v_new_orders) new_order
            ), '[]'::jsonb)
          )
        else session
      end order by position
    ), '[]'::jsonb)
    into v_sessions
    from jsonb_array_elements(coalesce((select data -> 'cashSessions' from public.il_mundo_cash_state where id = 1), '[]'::jsonb))
      with ordinality as cash(session, position);

    select data into v_cash
    from public.il_mundo_cash_state
    where id = 1
    for update;
    if jsonb_array_length(v_new_orders) > 0 then
      update public.il_mundo_cash_state
      set data = jsonb_set(coalesce(v_cash, '{"cashSessions":[]}'::jsonb), '{cashSessions}', v_sessions, true),
          updated_at = now()
      where id = 1;
    end if;
  else
  v_cash := jsonb_build_object(
    'cashSessions',
    coalesce(p_cash_state -> 'cashSessions', '[]'::jsonb)
  );

  insert into public.il_mundo_cash_state (id, data, updated_at)
  values (1, v_cash, now())
  on conflict (id) do update
  set data = excluded.data,
      updated_at = excluded.updated_at;
  end if;

  update public.il_mundo_state
  set data = p_state - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team',
      revision = il_mundo_state.revision + 1,
      updated_at = now()
  where id = 1
  returning il_mundo_state.data, il_mundo_state.revision
  into v_current, v_revision;

  select c.data into v_cash
  from public.il_mundo_cash_state c
  where c.id = 1;

  return query
  select v_current,
         coalesce(v_cash, '{"cashSessions":[]}'::jsonb),
         v_revision;
end;
$$;

revoke all on function public.il_mundo_save(jsonb, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.il_mundo_save(jsonb, jsonb, bigint) to authenticated;
