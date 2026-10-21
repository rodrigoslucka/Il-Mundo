create table if not exists public.il_mundo_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'worker' check (role in ('admin', 'worker')),
  created_at timestamptz not null default now()
);

create table if not exists public.il_mundo_state (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.il_mundo_cash_state (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{"cashSessions":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

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
begin
  if p_order ->> 'createdBy' is distinct from p_user_id::text
     or p_order ->> 'status' is distinct from 'new'
     or p_order #>> '{payment,method}' is null
     or not (coalesce(p_state -> 'settings' -> 'paymentMethods', '[]'::jsonb) ? (p_order #>> '{payment,method}'))
     or p_order #>> '{payment,paidAt}' is null
     or jsonb_typeof(p_order -> 'items') <> 'array'
     or jsonb_array_length(p_order -> 'items') = 0 then
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

  if p_order ->> 'channel' = 'delivery' then
    v_total := v_total + coalesce((p_order ->> 'deliveryFee')::numeric, 0);
  end if;
  return (p_order #>> '{payment,amount}')::numeric = v_total;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

create or replace function public.il_mundo_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invited_at is null then
    raise exception 'Las cuentas solo pueden crearse mediante invitación.';
  end if;
  insert into public.il_mundo_profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    'worker'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists il_mundo_auth_user_created on auth.users;
create trigger il_mundo_auth_user_created
  after insert on auth.users
  for each row execute function public.il_mundo_create_profile();

alter table public.il_mundo_profiles enable row level security;
alter table public.il_mundo_state enable row level security;
alter table public.il_mundo_cash_state enable row level security;

drop policy if exists "Authenticated users can read workspace profiles" on public.il_mundo_profiles;
create policy "Authenticated users can read workspace profiles"
  on public.il_mundo_profiles for select to authenticated using (true);

drop policy if exists "Authenticated users can read shared workspace state" on public.il_mundo_state;
create policy "Authenticated users can read shared workspace state"
  on public.il_mundo_state for select to authenticated using (true);

drop policy if exists "Admins can read cash workspace state" on public.il_mundo_cash_state;
create policy "Admins can read cash workspace state"
  on public.il_mundo_cash_state for select to authenticated
  using ((select public.il_mundo_current_role()) = 'admin');

revoke all on public.il_mundo_profiles, public.il_mundo_state, public.il_mundo_cash_state from anon, authenticated;
grant select on public.il_mundo_profiles, public.il_mundo_state to authenticated;
grant select on public.il_mundo_cash_state to authenticated;

create or replace function public.il_mundo_bootstrap(p_state jsonb, p_cash_state jsonb)
returns table (state jsonb, cash_state jsonb, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state jsonb;
  v_cash jsonb;
  v_revision bigint;
begin
  if public.il_mundo_current_role() is distinct from 'admin' then
    raise exception 'Solo un administrador puede inicializar el espacio de trabajo.';
  end if;

  insert into public.il_mundo_state (id, data)
  values (1, p_state - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team')
  on conflict (id) do nothing;

  insert into public.il_mundo_cash_state (id, data)
  values (1, jsonb_build_object('cashSessions', coalesce(p_cash_state -> 'cashSessions', '[]'::jsonb)))
  on conflict (id) do nothing;

  select s.data, s.revision into v_state, v_revision
  from public.il_mundo_state s where s.id = 1;
  select c.data into v_cash from public.il_mundo_cash_state c where c.id = 1;
  return query select v_state, v_cash, v_revision;
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
  v_session jsonb;
  v_sessions jsonb;
  v_new_orders jsonb := '[]'::jsonb;
  v_index integer;
begin
  if v_role is null or v_role not in ('admin', 'worker') then
    raise exception 'La cuenta no tiene un rol activo.';
  end if;

  select s.data, s.revision into v_current, v_revision
  from public.il_mundo_state s where s.id = 1 for update;
  if not found then
    raise exception 'El espacio de trabajo todavía no fue inicializado por un administrador.';
  end if;
  if v_revision <> p_expected_revision then
    raise exception 'CONFLICT: el espacio de trabajo cambió en otro dispositivo. Actualiza e inténtalo de nuevo.';
  end if;

  if v_role = 'worker' then
    if (p_state - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team')
       is distinct from
       (v_current - 'orders' - 'cashSessions' - 'activeRole' - 'activeMemberId' - 'team') then
      raise exception 'Los trabajadores no pueden modificar el menú, los ajustes ni las cuentas.';
    end if;

    if jsonb_typeof(p_state -> 'orders') <> 'array'
       or jsonb_array_length(p_state -> 'orders') < jsonb_array_length(coalesce(v_current -> 'orders', '[]'::jsonb)) then
      raise exception 'No se permite borrar pedidos.';
    end if;

    for v_old_order in
      select value from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb))
    loop
      select value into v_order
      from jsonb_array_elements(p_state -> 'orders')
      where value ->> 'id' = v_old_order ->> 'id'
      limit 1;
      if v_order is null then
        raise exception 'No se permite borrar pedidos.';
      end if;
      if (v_order - 'status' - 'updatedAt' - 'deliveryPersonId')
         is distinct from
         (v_old_order - 'status' - 'updatedAt' - 'deliveryPersonId') then
        raise exception 'Los trabajadores solo pueden cambiar el estado de una orden.';
      end if;
      if v_order ->> 'deliveryPersonId' is distinct from v_old_order ->> 'deliveryPersonId'
         and not (
           coalesce(v_old_order ->> 'deliveryPersonId', '') = ''
           and v_order ->> 'deliveryPersonId' = (select auth.uid())::text
           and v_order ->> 'channel' = 'delivery'
           and v_old_order ->> 'status' <> 'delivered'
         ) then
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

    for v_order in
      select value from jsonb_array_elements(p_state -> 'orders')
    loop
      if not exists (
        select 1 from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb)) old_order
        where old_order ->> 'id' = v_order ->> 'id'
      ) then
        if not public.il_mundo_order_is_valid(v_order, v_current, (select auth.uid())) then
          raise exception 'El nuevo pedido no cumple los requisitos de creación.';
        end if;
        v_new_orders := v_new_orders || jsonb_build_array(v_order);
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

    select data into v_cash from public.il_mundo_cash_state where id = 1 for update;
    if jsonb_array_length(v_new_orders) > 0 then
      update public.il_mundo_cash_state
      set data = jsonb_set(coalesce(v_cash, '{"cashSessions":[]}'::jsonb), '{cashSessions}', v_sessions, true),
          updated_at = now()
      where id = 1;
    end if;
  else
    select c.data into v_cash from public.il_mundo_cash_state c where c.id = 1 for update;
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

revoke all on function public.il_mundo_bootstrap(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.il_mundo_save(jsonb, jsonb, bigint) from public, anon, authenticated;
revoke all on function public.il_mundo_order_is_valid(jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.il_mundo_bootstrap(jsonb, jsonb) to authenticated;
grant execute on function public.il_mundo_save(jsonb, jsonb, bigint) to authenticated;

alter publication supabase_realtime add table public.il_mundo_state;
alter publication supabase_realtime add table public.il_mundo_cash_state;
alter publication supabase_realtime add table public.il_mundo_profiles;
