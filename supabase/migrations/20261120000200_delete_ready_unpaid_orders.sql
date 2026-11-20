create or replace function public.il_mundo_delete_ready_order(
  p_order_id text,
  p_expected_revision bigint
)
returns table (revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.il_mundo_current_role();
  v_current jsonb;
  v_revision bigint;
  v_order jsonb;
  v_remaining_orders jsonb;
  v_saved_revision bigint;
begin
  if (select auth.uid()) is null or v_role is null or v_role not in ('admin', 'cashier') then
    raise exception 'La cuenta no puede eliminar pedidos.';
  end if;
  if nullif(trim(p_order_id), '') is null or p_expected_revision is null then
    raise exception 'El pedido o la revisión no son válidos.';
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

  select entry.value
  into v_order
  from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb)) as entry(value)
  where entry.value ->> 'id' = p_order_id
  limit 1;
  if not found then
    raise exception 'El pedido ya no está disponible.';
  end if;
  if v_order ->> 'status' is distinct from 'ready'
     or v_order #>> '{payment,paidAt}' is not null then
    raise exception 'Solo se pueden eliminar pedidos listos que aún no estén pagados.';
  end if;

  select coalesce(jsonb_agg(entry.value order by entry.ordinality), '[]'::jsonb)
  into v_remaining_orders
  from jsonb_array_elements(coalesce(v_current -> 'orders', '[]'::jsonb))
    with ordinality as entry(value, ordinality)
  where entry.value ->> 'id' is distinct from p_order_id;

  update public.il_mundo_state s
  set data = jsonb_set(v_current, '{orders}', v_remaining_orders, true),
      revision = s.revision + 1,
      updated_at = now()
  where s.id = 1
  returning s.revision into v_saved_revision;

  return query select v_saved_revision;
end;
$$;

revoke all on function public.il_mundo_delete_ready_order(text, bigint) from public, anon, authenticated;
grant execute on function public.il_mundo_delete_ready_order(text, bigint) to authenticated;
