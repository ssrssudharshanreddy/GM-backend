import pg from 'pg';
const {Client} = pg;
const client = new Client({connectionString: 'postgresql://postgres.lrrjkdxntsdnmbtntepx:GangaMaxx@18@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'});
await client.connect();
await client.query(`
CREATE OR REPLACE FUNCTION public.place_order(p_customer_id uuid, p_delivery_address jsonb, p_items jsonb, p_special_instructions text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id UUID;
  v_item RECORD;
  v_product RECORD;
  v_subtotal NUMERIC(15,2) := 0;
  v_gst_amount NUMERIC(15,2) := 0;
  v_total NUMERIC(15,2) := 0;
  v_line_total NUMERIC(15,2);
  v_line_gst NUMERIC(15,2);
  v_available_credit NUMERIC(15,2);
  v_status order_status := 'PENDING';
  v_actor UUID := auth.uid();
BEGIN
  INSERT INTO orders (
    customer_id, delivery_address, special_instructions, status
  ) VALUES (
    p_customer_id, p_delivery_address, p_special_instructions, v_status
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_item.product_id;
    IF NOT FOUND OR NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product % not found or inactive', v_item.product_id;
    END IF;

    v_line_total := v_product.price * v_item.quantity;
    v_line_gst := v_line_total * (v_product.gst_rate / 100);
    
    v_subtotal := v_subtotal + v_line_total;
    v_gst_amount := v_gst_amount + v_line_gst;
    v_total := v_total + v_line_total + v_line_gst;

    INSERT INTO order_items (
      order_id, product_id, product_name, product_code, unit,
      unit_price, gst_rate, hsn_code, quantity,
      gst_amount, line_total, total_with_gst
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_product.product_code, v_product.unit,
      v_product.price, v_product.gst_rate, v_product.hsn_code, v_item.quantity,
      v_line_gst, v_line_total, v_line_total + v_line_gst
    );
  END LOOP;

  UPDATE orders SET
    subtotal = v_subtotal,
    gst_amount = v_gst_amount,
    total_amount = v_total
  WHERE id = v_order_id;

  v_available_credit := get_available_credit(p_customer_id);
  IF v_available_credit < v_total THEN
    RAISE EXCEPTION 'Insufficient credit. Available: %, Required: %', v_available_credit, v_total;
  END IF;

  PERFORM reserve_order_inventory(v_order_id);

  IF v_actor = p_customer_id THEN
    v_actor := NULL;
  END IF;
  
  PERFORM consume_credit(p_customer_id, v_total, 'order', v_order_id, v_actor);

  INSERT INTO invoices (
    order_id, customer_id, status, subtotal, gst_breakdown, total_gst, total_amount, outstanding_amount, due_date
  ) VALUES (
    v_order_id, p_customer_id, 'UNPAID', v_subtotal, '[]'::jsonb, v_gst_amount, v_total, v_total, CURRENT_DATE + (SELECT credit_days FROM credit_accounts WHERE customer_id = p_customer_id)
  );

  RETURN v_order_id;
END;
$function$;
`);
console.log('Fixed place_order RPC!');
await client.end();
