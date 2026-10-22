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
     or p_order ->> 'channel' is null
     or p_order ->> 'channel' not in ('dinein', 'pickup', 'delivery')
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

  return (p_order #>> '{payment,amount}')::numeric = v_total;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

update public.il_mundo_state
set data = jsonb_set(
  data,
  '{settings}',
  (data -> 'settings') - 'deliveryFee',
  true
)
where data #> '{settings}' ? 'deliveryFee';

update public.il_mundo_state
set data = jsonb_set(
  data,
  '{orders}',
  coalesce((
    select jsonb_agg(value - 'deliveryFee' order by position)
    from jsonb_array_elements(data -> 'orders') with ordinality as orders(value, position)
  ), '[]'::jsonb),
  true
)
where data -> 'orders' is not null;
