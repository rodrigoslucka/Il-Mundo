update public.il_mundo_state
set data = jsonb_set(
  data,
  '{settings,paymentMethods}',
  coalesce(data #> '{settings,paymentMethods}', '[]'::jsonb) || '["Tarjeta"]'::jsonb,
  true
),
updated_at = now()
where not coalesce(data #> '{settings,paymentMethods}', '[]'::jsonb) ? 'Tarjeta';

create or replace function public.il_mundo_order_is_valid(p_order jsonb, p_state jsonb, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_extra jsonb;
  v_product jsonb;
  v_variant_price numeric;
  v_extra_price numeric;
  v_item_price numeric;
  v_total numeric := 0;
  v_paid_at text := p_order #>> '{payment,paidAt}';
  v_method text := p_order #>> '{payment,method}';
begin
  if p_order ->> 'createdBy' is distinct from p_user_id::text
     or p_order ->> 'status' is distinct from 'new'
     or coalesce(p_order ->> 'channel', '') not in ('dinein', 'pickup', 'delivery')
     or jsonb_typeof(p_order -> 'items') is distinct from 'array'
     or jsonb_array_length(coalesce(p_order -> 'items', '[]'::jsonb)) = 0 then
    return false;
  end if;
  if p_order ->> 'channel' <> 'dinein'
     and nullif(trim(p_order ->> 'customerName'), '') is null then
    return false;
  end if;
  if p_order ->> 'channel' = 'delivery'
     and nullif(trim(p_order ->> 'address'), '') is null then
    return false;
  end if;
  if v_paid_at is not null
     and (v_method is null
       or v_method not in ('Efectivo', 'QR', 'Tarjeta')
       or not (coalesce(p_state -> 'settings' -> 'paymentMethods', '[]'::jsonb) ? v_method)
       or p_order #>> '{payment,amount}' is null) then
    return false;
  end if;
  if v_paid_at is null and v_method is not null then
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(p_order -> 'items')
  loop
    select value into v_product
    from jsonb_array_elements(coalesce(p_state -> 'menu', '[]'::jsonb))
    where value ->> 'id' = v_item ->> 'menuItemId'
      and value ->> 'active' = 'true'
      and value ->> 'name' = v_item ->> 'name'
      and value ->> 'category' = v_item ->> 'category'
    limit 1;
    if v_product is null
       or coalesce((v_item ->> 'quantity')::integer, 0) < 1
       or coalesce((v_item ->> 'quantity')::integer, 0) > 99 then
      return false;
    end if;

    if v_item ->> 'category' = 'Bebidas' then
      select (variant ->> 'price')::numeric into v_variant_price
      from jsonb_array_elements(coalesce(v_product -> 'variants', '[]'::jsonb)) variant
      where (variant ->> 'price')::numeric = (v_item ->> 'price')::numeric
      limit 1;
    else
      select (variant ->> 'price')::numeric into v_variant_price
      from jsonb_array_elements(coalesce(v_product -> 'variants', '[]'::jsonb)) variant
      where variant ->> 'name' = v_item ->> 'variant'
      limit 1;
    end if;
    if v_variant_price is null then
      return false;
    end if;

    v_extra_price := 0;
    for v_extra in select value from jsonb_array_elements(coalesce(v_item -> 'extras', '[]'::jsonb))
    loop
      select (extra ->> 'price')::numeric into v_item_price
      from jsonb_array_elements(coalesce(p_state -> 'settings' -> 'extras', '[]'::jsonb)) extra
      where extra ->> 'name' = v_extra #>> '{}'
      limit 1;
      if v_item_price is null then
        return false;
      end if;
      v_extra_price := v_extra_price + v_item_price;
    end loop;

    if v_item ->> 'category' <> 'Pizzas' and v_extra_price <> 0 then
      return false;
    end if;
    if jsonb_array_length(coalesce(v_item -> 'extras', '[]'::jsonb)) <>
       (select count(distinct value #>> '{}')::integer
        from jsonb_array_elements(coalesce(v_item -> 'extras', '[]'::jsonb))) then
      return false;
    end if;
    if (v_item ->> 'price')::numeric <> v_variant_price + v_extra_price then
      return false;
    end if;
    v_total := v_total + (v_item ->> 'price')::numeric * (v_item ->> 'quantity')::integer;
  end loop;

  return v_paid_at is null or round((p_order #>> '{payment,amount}')::numeric, 2) = round(v_total, 2);
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

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
  v_paid_orders jsonb := '[]'::jsonb;
  v_order_index integer;
  v_validation_order jsonb;
  v_now timestamptz := clock_timestamp();
  v_business_date text;
begin
  v_business_date := (v_now at time zone 'America/La_Paz')::date::text;
  if v_role is null or v_role not in ('admin', 'cashier', 'worker') then
    raise exception 'La cuenta no tiene un rol activo.';
  end if;

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

  if v_role = 'cashier' then
    if (p_state - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team')
       is distinct from
       (v_current - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team') then
      raise exception 'Caja solo puede gestionar pedidos.';
    end if;
    if jsonb_typeof(p_state -> 'orders') is distinct from 'array'
       or jsonb_array_length(p_state -> 'orders') < jsonb_array_length(coalesce(v_current -> 'orders', '[]'::jsonb)) then
      raise exception 'Caja no puede borrar pedidos.';
    end if;

    for v_old_order in
      select value from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb))
    loop
      select value into v_order
      from jsonb_array_elements(p_state -> 'orders')
      where value ->> 'id' = v_old_order ->> 'id'
      limit 1;
      if v_order is null then
        raise exception 'Caja no puede borrar pedidos.';
      end if;
      if v_order is distinct from v_old_order then
        if v_old_order ->> 'status' = 'ready'
           and v_old_order #>> '{payment,paidAt}' is null
           and v_order ->> 'status' = 'new'
           and v_order #>> '{payment,paidAt}' is null then
          if (v_order - 'status' - 'updatedAt' - 'items' - 'channel' - 'tableId' - 'tableName' - 'customerName' - 'phone' - 'address' - 'notes')
             is distinct from
             (v_old_order - 'status' - 'updatedAt' - 'items' - 'channel' - 'tableId' - 'tableName' - 'customerName' - 'phone' - 'address' - 'notes') then
            raise exception 'Caja solo puede editar el contenido de un pedido listo y no pagado.';
          end if;
          v_validation_order := jsonb_set(v_order, '{createdBy}', to_jsonb((select auth.uid())::text), true);
          if not public.il_mundo_order_is_valid(v_validation_order, v_current, (select auth.uid())) then
            raise exception 'El pedido editado no cumple los requisitos de validación.';
          end if;
        elsif v_old_order ->> 'status' = 'ready'
          and v_old_order #>> '{payment,paidAt}' is null
          and v_order ->> 'status' = 'delivered'
          and v_order #>> '{payment,paidAt}' is not null then
          if (v_order - 'status' - 'updatedAt' - 'payment' - 'paymentMethod' - 'deliveredAt')
             is distinct from
             (v_old_order - 'status' - 'updatedAt' - 'payment' - 'paymentMethod' - 'deliveredAt') then
            raise exception 'Caja solo puede registrar el pago de un pedido listo sin modificarlo.';
          end if;
          v_validation_order := jsonb_set(
            jsonb_set(v_order, '{status}', to_jsonb('new'::text), true),
            '{createdBy}', to_jsonb((select auth.uid())::text), true
          );
          if not public.il_mundo_order_is_valid(v_validation_order, v_current, (select auth.uid())) then
            raise exception 'El pago no coincide con los datos del pedido.';
          end if;
          v_paid_orders := v_paid_orders || jsonb_build_array(v_order);
        else
          raise exception 'Caja no puede modificar pedidos en este estado.';
        end if;
      end if;
    end loop;

    for v_order, v_order_index in
      select value, (ordinality - 1)::integer
      from jsonb_array_elements(p_state -> 'orders') with ordinality
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
        p_state := jsonb_set(p_state, array['orders', v_order_index::text], v_order, true);
      end if;
    end loop;

    if exists (
      select 1
      from jsonb_array_elements(p_state -> 'orders') as orders(value)
      group by value ->> 'id'
      having value ->> 'id' is null or count(*) > 1
    ) then
      raise exception 'Cada pedido debe tener un identificador único.';
    end if;

    if jsonb_array_length(v_paid_orders) > 0 then
      select data into v_cash from public.il_mundo_cash_state where id = 1 for update;
      select coalesce(jsonb_agg(
        case
          when session ->> 'closedAt' is null then
            jsonb_set(
              session,
              '{transactions}',
              coalesce(session -> 'transactions', '[]'::jsonb) ||
              coalesce((
                select jsonb_agg(jsonb_build_object(
                  'orderId', paid_order ->> 'id',
                  'method', paid_order #>> '{payment,method}',
                  'amount', (paid_order #>> '{payment,amount}')::numeric,
                  'paidAt', paid_order #>> '{payment,paidAt}'
                ))
                from jsonb_array_elements(v_paid_orders) paid_order
              ), '[]'::jsonb),
              true
            )
          else session
        end order by position
      ), '[]'::jsonb)
      into v_sessions
      from jsonb_array_elements(coalesce(v_cash -> 'cashSessions', '[]'::jsonb))
        with ordinality as cash(session, position);
      if exists (select 1 from jsonb_array_elements(coalesce(v_cash -> 'cashSessions', '[]'::jsonb)) session where session ->> 'closedAt' is null) then
        update public.il_mundo_cash_state
        set data = jsonb_set(coalesce(v_cash, '{"cashSessions":[]}'::jsonb), '{cashSessions}', v_sessions, true),
            updated_at = now()
        where id = 1;
      end if;
    end if;
  elsif v_role = 'worker' then
    if (p_state - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team')
       is distinct from
       (v_current - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team') then
      raise exception 'Los trabajadores no pueden modificar el menú, los ajustes ni las cuentas.';
    end if;
    if jsonb_typeof(p_state -> 'orders') is distinct from 'array'
       or jsonb_array_length(p_state -> 'orders') < jsonb_array_length(coalesce(v_current -> 'orders', '[]'::jsonb)) then
      raise exception 'No se permite borrar pedidos.';
    end if;

    for v_old_order in select value from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb))
    loop
      select value into v_order from jsonb_array_elements(p_state -> 'orders')
      where value ->> 'id' = v_old_order ->> 'id' limit 1;
      if v_order is null then raise exception 'No se permite borrar pedidos.'; end if;
      if (v_order - 'status' - 'updatedAt' - 'deliveryPersonId')
         is distinct from (v_old_order - 'status' - 'updatedAt' - 'deliveryPersonId') then
        raise exception 'Los trabajadores solo pueden cambiar el estado de una orden.';
      end if;
      if v_order ->> 'deliveryPersonId' is distinct from v_old_order ->> 'deliveryPersonId'
         and not (coalesce(v_old_order ->> 'deliveryPersonId', '') = ''
           and v_order ->> 'deliveryPersonId' = (select auth.uid())::text
           and v_order ->> 'channel' = 'delivery'
           and v_old_order ->> 'status' <> 'delivered') then
        raise exception 'Solo puedes asignarte un pedido de delivery disponible.';
      end if;
      if v_order ->> 'status' is distinct from v_old_order ->> 'status'
         and not (
           (v_old_order ->> 'status' = 'new' and v_order ->> 'status' = 'preparing')
           or (v_old_order ->> 'status' = 'preparing' and v_order ->> 'status' = 'ready')
           or (v_old_order ->> 'status' = 'new' and v_order ->> 'status' = 'ready')
           or (v_old_order ->> 'status' = 'ready' and v_order ->> 'status' = 'delivered')
         ) then
        raise exception 'La transición de estado del pedido no está permitida.';
      end if;
      if v_order ->> 'status' = 'delivered'
         and v_old_order ->> 'status' = 'ready'
         and v_old_order ->> 'channel' = 'delivery'
         and v_old_order ->> 'deliveryPersonId' <> (select auth.uid())::text then
        raise exception 'Solo el repartidor asignado puede cerrar este delivery.';
      end if;
    end loop;

    for v_order in select value from jsonb_array_elements(p_state -> 'orders')
    loop
      if not exists (
        select 1 from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb)) old_order
        where old_order ->> 'id' = v_order ->> 'id'
      ) and not public.il_mundo_order_is_valid(v_order, v_current, (select auth.uid())) then
        raise exception 'El nuevo pedido no cumple los requisitos de creación.';
      end if;
    end loop;
    if exists (
      select 1
      from jsonb_array_elements(p_state -> 'orders') as orders(value)
      group by value ->> 'id'
      having value ->> 'id' is null or count(*) > 1
    ) then
      raise exception 'Cada pedido debe tener un identificador único.';
    end if;
  else
    v_cash := jsonb_build_object('cashSessions', coalesce(p_cash_state -> 'cashSessions', '[]'::jsonb));
    insert into public.il_mundo_cash_state (id, data, updated_at)
    values (1, v_cash, now())
    on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
  end if;

  update public.il_mundo_state
  set data = p_state - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team',
      revision = il_mundo_state.revision + 1,
      updated_at = now()
  where id = 1
  returning il_mundo_state.data, il_mundo_state.revision into v_current, v_revision;

  select c.data into v_cash from public.il_mundo_cash_state c where c.id = 1;
  return query select v_current, coalesce(v_cash, '{"cashSessions":[]}'::jsonb), v_revision;
end;
$$;

revoke all on function public.il_mundo_save(jsonb, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.il_mundo_save(jsonb, jsonb, bigint) to authenticated;
revoke all on function public.il_mundo_order_is_valid(jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.il_mundo_order_is_valid(jsonb, jsonb, uuid) to authenticated;
