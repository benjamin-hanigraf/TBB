-- ============ Part 9: exact stock on cancel and refund, inbox "read" separate from "dealt with" ============
-- Run after v8. Safe to run twice.

-- 1. each order line remembers how many units it actually took from stock (pre-order items may take none),
--    so cancelling or refunding gives back exactly that many
alter table order_items add column if not exists stock_taken integer;
update order_items i set stock_taken = i.qty from orders o
  where o.id = i.order_id and i.stock_taken is null and i.product_id is not null and o.status in ('paid','packed','shipped','delivered');

-- take stock for an order (once) or give it back. Used by the server after a payment, and by the Manager app.
create or replace function order_stock_internal(p_order uuid, p_take boolean) returns void language plpgsql security definer set search_path = public as $$
declare it record; s integer; n integer;
begin
  if p_take then
    for it in select i.id, i.product_id, i.qty from order_items i where i.order_id = p_order and i.product_id is not null and i.stock_taken is null for update loop
      select stock into s from products where id = it.product_id for update;
      n := least(it.qty, greatest(coalesce(s, 0), 0));                 -- a pre-order may find less (or nothing) in stock
      update products set stock = stock - n where id = it.product_id;
      update order_items set stock_taken = n where id = it.id;
    end loop;
  else
    for it in select i.id, i.product_id, i.stock_taken from order_items i where i.order_id = p_order and i.product_id is not null and i.stock_taken > 0 for update loop
      update products set stock = stock + it.stock_taken where id = it.product_id;
    end loop;
    update order_items set stock_taken = null where order_id = p_order;
  end if;
end $$;
revoke all on function order_stock_internal(uuid, boolean) from public, anon, authenticated;
grant execute on function order_stock_internal(uuid, boolean) to service_role;

create or replace function admin_order_stock(p_order uuid, p_take boolean) returns void language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'not allowed'; end if; perform order_stock_internal(p_order, p_take); end $$;
revoke all on function admin_order_stock(uuid, boolean) from public, anon; grant execute on function admin_order_stock(uuid, boolean) to authenticated;

-- a manual order now takes stock through the same function, so it can be given back exactly
create or replace function admin_add_order(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid; it jsonb; paid boolean := (p->>'pay') = 'paid'; gst int := 0; total int := (p->>'total_paise')::int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into orders (name, email, phone, shipping_address, subtotal_paise, shipping_paise, total_paise, status, channel, payment_method, paid_at, notes)
  values (p->>'name', coalesce(p->>'email',''), coalesce(p->>'phone',''), coalesce(p->'address','{}'::jsonb), (p->>'subtotal_paise')::int, (p->>'shipping_paise')::int, total,
          case when paid then 'paid' else 'pending' end, 'manual', case when paid then p->>'method' end, case when paid then now() end, nullif(p->>'notes',''))
  returning id into oid;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_id, title, unit_paise, qty, gst_paise)
    values (oid, nullif(it->>'product_id','')::uuid, it->>'title', (it->>'unit_paise')::int, (it->>'qty')::int, coalesce((it->>'gst_paise')::int, 0));
    gst := gst + coalesce((it->>'gst_paise')::int, 0);
  end loop;
  if paid then
    perform order_stock_internal(oid, true);
    insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
    values ((now() at time zone 'Asia/Kolkata')::date, 'in', 'Store sales', 'Order added by hand', total, gst, coalesce(p->>'method','other'), p->>'name', 'order', oid) on conflict do nothing;
  end if;
  return oid;
end $$;
revoke all on function admin_add_order(jsonb) from public; grant execute on function admin_add_order(jsonb) to authenticated;

-- 2. inbox: opening a message marks it read; "dealt with" is a separate choice
alter table enquiries add column if not exists read_at timestamptz;
update enquiries set read_at = created_at where handled and read_at is null;
