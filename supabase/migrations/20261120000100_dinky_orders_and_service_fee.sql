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
     or coalesce(p_order ->> 'channel', '') not in ('dinein', 'pickup', 'delivery', 'dinky')
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
  if p_order ->> 'channel' = 'dinein'
     and not exists (
       select 1
       from jsonb_array_elements(coalesce(p_state -> 'tables', '[]'::jsonb)) table_entry
       where p_order ->> 'tableId' ~ '^mesa-[1-8]$'
         and table_entry ->> 'id' = p_order ->> 'tableId'
         and table_entry ->> 'name' = p_order ->> 'tableName'
     ) then
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

  if p_order ->> 'channel' = 'dinky' then
    v_total := round(v_total * 1.05, 2);
  end if;

  return v_paid_at is null or round((p_order #>> '{payment,amount}')::numeric, 2) = round(v_total, 2);
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;
