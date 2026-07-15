ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE OR REPLACE FUNCTION create_order(
  p_business_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_product RECORD;
BEGIN
  v_order_number := 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO orders (
    business_id, order_number, status, subtotal, total,
    customer_name, customer_phone, customer_address, notes,
    currency, shipping, tax
  ) VALUES (
    p_business_id, v_order_number, 'pending', 0, 0,
    p_customer_name, p_customer_phone, p_customer_address, p_notes,
    'USD', 0, 0
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, price, sale_price, stock INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id';
    END IF;

    IF v_product.stock < (v_item->>'quantity')::INT THEN
      RAISE EXCEPTION 'Stock insuficiente para %', v_product.name;
    END IF;

    UPDATE products
    SET stock = stock - (v_item->>'quantity')::INT
    WHERE id = v_product.id;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total)
    VALUES (
      v_order_id,
      v_product.id,
      v_item->>'product_name',
      (v_item->>'quantity')::INT,
      COALESCE(v_product.sale_price, v_product.price),
      COALESCE(v_product.sale_price, v_product.price) * (v_item->>'quantity')::INT
    );

    v_subtotal := v_subtotal + COALESCE(v_product.sale_price, v_product.price) * (v_item->>'quantity')::INT;
  END LOOP;

  UPDATE orders
  SET subtotal = v_subtotal,
      total = v_subtotal
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_businesses()
RETURNS TABLE (id uuid, name text, slug text, logo_url text, currency text, whatsapp_phone text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.slug, b.logo_url, b.currency, b.whatsapp_phone
  FROM public.businesses b
  INNER JOIN public.memberships m ON m.business_id = b.id
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at;
$$;
