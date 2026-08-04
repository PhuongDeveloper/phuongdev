-- =============================================================================
-- Migration 011: Professional digital marketplace
-- Product packages, inventory, sold counters and atomic payment fulfilment.
-- Run after 010_user_system.sql.
-- =============================================================================

-- ---------- Product merchandising ----------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS total_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_sold >= 0),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fulfillment_time TEXT NOT NULL DEFAULT 'Giao ngay sau thanh toán',
  ADD COLUMN IF NOT EXISTS warranty_text TEXT NOT NULL DEFAULT 'Hỗ trợ trong thời hạn gói';

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  duration_label TEXT,
  price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
  compare_at_price BIGINT CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  inventory_policy TEXT NOT NULL DEFAULT 'finite'
    CHECK (inventory_policy IN ('finite', 'unlimited')),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  purchase_limit INTEGER NOT NULL DEFAULT 10 CHECK (purchase_limit BETWEEN 1 AND 100),
  key_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (key_type IN ('trial', 'permanent')),
  download_url TEXT,
  delivery_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx
  ON product_variants(product_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS product_variants_stock_idx
  ON product_variants(inventory_policy, stock_quantity) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trigger_product_variants_updated_at ON product_variants;
CREATE TRIGGER trigger_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create one backwards-compatible package for every existing product.
INSERT INTO product_variants (
  product_id, name, sku, short_description, price, inventory_policy,
  stock_quantity, key_type, is_active, is_featured, sort_order
)
SELECT
  p.id,
  CASE WHEN p.price = 0 THEN 'Miễn phí' ELSE 'Bản tiêu chuẩn' END,
  'LEGACY-' || UPPER(SUBSTR(REPLACE(p.id::TEXT, '-', ''), 1, 12)),
  p.description,
  p.price::BIGINT,
  CASE WHEN p.has_key THEN 'finite' ELSE 'unlimited' END,
  CASE
    WHEN p.has_key THEN (
      SELECT COUNT(*)::INTEGER
      FROM product_keys pk
      WHERE pk.product_id = p.id AND pk.is_used = FALSE
    )
    ELSE 0
  END,
  CASE WHEN p.price = 0 THEN 'trial' ELSE 'permanent' END,
  p.is_active,
  TRUE,
  0
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id
);

-- ---------- Orders, keys and payments ----------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id),
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS unit_price BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  ADD COLUMN IF NOT EXISTS delivery_data JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS inventory_reserved BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE orders o
SET variant_id = pv.id,
    variant_name = pv.name,
    sku = pv.sku,
    unit_price = o.amount,
    quantity = 1
FROM product_variants pv
WHERE o.variant_id IS NULL AND pv.product_id = o.product_id AND pv.sort_order = 0;

UPDATE product_variants pv
SET sold_count = totals.quantity
FROM (
  SELECT variant_id, COUNT(*)::INTEGER AS quantity
  FROM orders
  WHERE status = 'completed' AND variant_id IS NOT NULL
  GROUP BY variant_id
) totals
WHERE pv.id = totals.variant_id;

UPDATE products p
SET total_sold = totals.quantity
FROM (
  SELECT product_id, COUNT(*)::INTEGER AS quantity
  FROM orders
  WHERE status = 'completed'
  GROUP BY product_id
) totals
WHERE p.id = totals.product_id;

ALTER TABLE product_keys
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserved_order_id UUID,
  ADD COLUMN IF NOT EXISTS order_id UUID;

UPDATE product_keys pk
SET variant_id = pv.id
FROM product_variants pv
WHERE pk.variant_id IS NULL AND pv.product_id = pk.product_id AND pv.sort_order = 0;

CREATE INDEX IF NOT EXISTS product_keys_variant_available_idx
  ON product_keys(variant_id, key_type, is_used, reserved_order_id);
CREATE INDEX IF NOT EXISTS product_keys_reserved_order_idx
  ON product_keys(reserved_order_id) WHERE reserved_order_id IS NOT NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'recharge'
    CHECK (purpose IN ('recharge', 'order')),
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;

UPDATE transactions
SET purpose = CASE WHEN payment_method = 'bank_qr' THEN 'order' ELSE 'recharge' END;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_provider_id_unique
  ON transactions(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'sepay',
  provider_transaction_id TEXT NOT NULL,
  transaction_code TEXT,
  transfer_amount BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'matched', 'unmatched', 'rejected', 'duplicate')),
  reason TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS payment_events_code_idx
  ON payment_events(transaction_code, created_at DESC);

-- ---------- RLS: public catalogue, real admins for mutations ----------
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, service_role;

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_product_variants" ON product_variants;
DROP POLICY IF EXISTS "admin_manage_product_variants" ON product_variants;
CREATE POLICY "public_read_active_product_variants" ON product_variants
  FOR SELECT USING (is_active = TRUE OR public.current_user_is_admin());
CREATE POLICY "admin_manage_product_variants" ON product_variants
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "admin_read_payment_events" ON payment_events;
CREATE POLICY "admin_read_payment_events" ON payment_events
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

-- Remove the legacy public write access for the commerce tables.
DROP POLICY IF EXISTS "Anon được thêm products" ON products;
DROP POLICY IF EXISTS "Anon được sửa products" ON products;
DROP POLICY IF EXISTS "Anon được xoá products" ON products;
DROP POLICY IF EXISTS "Chỉ admin được thêm products" ON products;
DROP POLICY IF EXISTS "Chỉ admin được sửa products" ON products;
DROP POLICY IF EXISTS "Chỉ admin được xoá products" ON products;

CREATE POLICY "verified_admin_insert_products" ON products
  FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_update_products" ON products
  FOR UPDATE TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_delete_products" ON products
  FOR DELETE TO authenticated USING (public.current_user_is_admin());

-- Close the legacy anonymous CMS policies and let verified admins manage content.
DROP POLICY IF EXISTS "Anon được thêm site_config" ON site_config;
DROP POLICY IF EXISTS "Anon được sửa site_config" ON site_config;
DROP POLICY IF EXISTS "Anon được xoá site_config" ON site_config;
DROP POLICY IF EXISTS "Anon được thêm projects" ON projects;
DROP POLICY IF EXISTS "Anon được sửa projects" ON projects;
DROP POLICY IF EXISTS "Anon được xoá projects" ON projects;
DROP POLICY IF EXISTS "Anon được thêm services" ON services;
DROP POLICY IF EXISTS "Anon được sửa services" ON services;
DROP POLICY IF EXISTS "Anon được xoá services" ON services;
DROP POLICY IF EXISTS "Anon được thêm blogs" ON blogs;
DROP POLICY IF EXISTS "Anon được sửa blogs" ON blogs;
DROP POLICY IF EXISTS "Anon được xoá blogs" ON blogs;
DROP POLICY IF EXISTS "Anon được thêm cộng đồng" ON communities;
DROP POLICY IF EXISTS "Anon được sửa cộng đồng" ON communities;
DROP POLICY IF EXISTS "Anon được xoá cộng đồng" ON communities;
DROP POLICY IF EXISTS "Anon được thêm categories" ON categories;
DROP POLICY IF EXISTS "Anon được sửa categories" ON categories;
DROP POLICY IF EXISTS "Anon được xoá categories" ON categories;

CREATE POLICY "verified_admin_manage_site_config" ON site_config
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_manage_projects" ON projects
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_manage_services" ON services
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_manage_blogs" ON blogs
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_manage_communities" ON communities
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "verified_admin_manage_categories" ON categories
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "product_keys_admin_only" ON product_keys;
CREATE POLICY "verified_admin_manage_product_keys" ON product_keys
  FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- Users can read their own financial history, but all money/order writes go through
-- authenticated server routes and service-role RPCs.
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;

-- Paid delivery URLs and instructions must never be exposed by the public catalogue API.
REVOKE SELECT ON products FROM anon, authenticated;
GRANT SELECT (
  id, title, slug, description, content, price, demo_url, image_url, category,
  is_active, has_key, gallery_images, badge, total_sold, is_featured,
  fulfillment_time, warranty_text, sort_order, views, created_at, updated_at
) ON products TO anon, authenticated;

REVOKE SELECT ON product_variants FROM anon, authenticated;
GRANT SELECT (
  id, product_id, name, sku, short_description, duration_label, price,
  compare_at_price, inventory_policy, stock_quantity, sold_count, purchase_limit,
  key_type, is_active, is_featured, sort_order, created_at, updated_at
) ON product_variants TO anon, authenticated;

-- ---------- Atomic wallet purchase ----------
CREATE OR REPLACE FUNCTION public.purchase_variant_with_wallet(
  p_user_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant product_variants%ROWTYPE;
  v_product products%ROWTYPE;
  v_profile user_profiles%ROWTYPE;
  v_order_id UUID := gen_random_uuid();
  v_total BIGINT;
  v_key_ids UUID[] := '{}';
  v_delivery JSONB := '[]'::JSONB;
  v_first_key TEXT;
  v_available_keys INTEGER := 0;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Số lượng không hợp lệ');
  END IF;

  SELECT * INTO v_variant FROM product_variants
  WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND OR NOT v_variant.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói sản phẩm không tồn tại hoặc đã dừng bán');
  END IF;

  SELECT * INTO v_product FROM products WHERE id = v_variant.product_id FOR UPDATE;
  IF NOT FOUND OR NOT v_product.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Sản phẩm đã dừng bán');
  END IF;

  IF p_quantity > v_variant.purchase_limit THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Vượt quá giới hạn mua cho mỗi đơn');
  END IF;

  IF v_variant.inventory_policy = 'finite' AND v_variant.stock_quantity < p_quantity THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói này không còn đủ hàng');
  END IF;

  v_total := v_variant.price * p_quantity;

  IF v_total = 0 AND EXISTS (
    SELECT 1 FROM orders
    WHERE user_id = p_user_id AND variant_id = p_variant_id
      AND amount = 0 AND status = 'completed'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Bạn đã nhận gói miễn phí này trước đó');
  END IF;

  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy hồ sơ người dùng');
  END IF;
  IF v_profile.coin_balance < v_total THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Số dư ví không đủ',
      'need_recharge', TRUE,
      'balance', v_profile.coin_balance,
      'required', v_total
    );
  END IF;

  IF v_product.has_key THEN
    SELECT COALESCE(array_agg(k.id), '{}'),
           COALESCE(jsonb_agg(jsonb_build_object('key', k.key_value, 'type', k.key_type)), '[]'::JSONB),
           MIN(k.key_value), COUNT(*)::INTEGER
    INTO v_key_ids, v_delivery, v_first_key, v_available_keys
    FROM (
      SELECT pk.id, pk.key_value, pk.key_type
      FROM product_keys pk
      WHERE pk.variant_id = p_variant_id
        AND pk.key_type = v_variant.key_type
        AND pk.is_used = FALSE
        AND pk.reserved_order_id IS NULL
      ORDER BY pk.created_at
      LIMIT p_quantity
      FOR UPDATE SKIP LOCKED
    ) k;

    IF v_available_keys < p_quantity THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Kho key của gói này đã hết');
    END IF;
  ELSE
    v_delivery := jsonb_build_array(jsonb_build_object(
      'download_url', COALESCE(v_variant.download_url, v_product.download_url),
      'note', COALESCE(v_variant.delivery_note, v_product.delivery_note)
    ));
  END IF;

  UPDATE user_profiles
  SET coin_balance = coin_balance - v_total,
      total_spent = total_spent + v_total,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO orders (
    id, user_id, product_id, product_title, variant_id, variant_name, sku,
    unit_price, quantity, amount, payment_method, status, key_id, key_value,
    delivery_data, completed_at
  ) VALUES (
    v_order_id, p_user_id, v_product.id, v_product.title, v_variant.id,
    v_variant.name, v_variant.sku, v_variant.price, p_quantity, v_total,
    CASE WHEN v_total = 0 THEN 'free_trial' ELSE 'coin' END,
    'completed', v_key_ids[1], v_first_key, v_delivery, NOW()
  );

  IF array_length(v_key_ids, 1) IS NOT NULL THEN
    UPDATE product_keys
    SET is_used = TRUE, used_by = p_user_id, used_at = NOW(), order_id = v_order_id
    WHERE id = ANY(v_key_ids);
  END IF;

  IF v_variant.inventory_policy = 'finite' THEN
    UPDATE product_variants
    SET stock_quantity = stock_quantity - p_quantity,
        sold_count = sold_count + p_quantity
    WHERE id = p_variant_id;
  ELSE
    UPDATE product_variants SET sold_count = sold_count + p_quantity WHERE id = p_variant_id;
  END IF;
  UPDATE products SET total_sold = total_sold + p_quantity WHERE id = v_product.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'amount', v_total,
    'delivery_data', v_delivery,
    'key_value', v_first_key,
    'download_url', COALESCE(v_variant.download_url, v_product.download_url),
    'delivery_intro', v_product.delivery_intro,
    'delivery_note', COALESCE(v_variant.delivery_note, v_product.delivery_note),
    'new_balance', v_profile.coin_balance - v_total
  );
END;
$$;

-- ---------- Reserve stock and create a bank purchase ----------
CREATE OR REPLACE FUNCTION public.create_bank_variant_purchase(
  p_user_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER,
  p_transaction_code TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant product_variants%ROWTYPE;
  v_product products%ROWTYPE;
  v_order_id UUID := gen_random_uuid();
  v_transaction_id UUID := gen_random_uuid();
  v_total BIGINT;
  v_key_ids UUID[] := '{}';
  v_available_keys INTEGER := 0;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Số lượng không hợp lệ');
  END IF;

  SELECT * INTO v_variant FROM product_variants WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND OR NOT v_variant.is_active OR p_quantity > v_variant.purchase_limit THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói sản phẩm không hợp lệ');
  END IF;
  SELECT * INTO v_product FROM products WHERE id = v_variant.product_id FOR UPDATE;
  IF NOT FOUND OR NOT v_product.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Sản phẩm đã dừng bán');
  END IF;

  v_total := v_variant.price * p_quantity;
  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói miễn phí không cần chuyển khoản');
  END IF;
  IF v_variant.inventory_policy = 'finite' AND v_variant.stock_quantity < p_quantity THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói này không còn đủ hàng');
  END IF;

  IF v_product.has_key THEN
    SELECT COALESCE(array_agg(k.id), '{}'), COUNT(*)::INTEGER
    INTO v_key_ids, v_available_keys
    FROM (
      SELECT pk.id
      FROM product_keys pk
      WHERE pk.variant_id = p_variant_id
        AND pk.key_type = v_variant.key_type
        AND pk.is_used = FALSE
        AND pk.reserved_order_id IS NULL
      ORDER BY pk.created_at
      LIMIT p_quantity
      FOR UPDATE SKIP LOCKED
    ) k;
    IF v_available_keys < p_quantity THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Kho key của gói này đã hết');
    END IF;
  END IF;

  INSERT INTO transactions (
    id, user_id, amount, coin_amount, status, transaction_code,
    payment_method, purpose, expires_at
  ) VALUES (
    v_transaction_id, p_user_id, v_total, 0, 'pending', p_transaction_code,
    'bank_qr', 'order', p_expires_at
  );

  INSERT INTO orders (
    id, user_id, product_id, product_title, variant_id, variant_name, sku,
    unit_price, quantity, amount, payment_method, status, transaction_id,
    inventory_reserved
  ) VALUES (
    v_order_id, p_user_id, v_product.id, v_product.title, v_variant.id,
    v_variant.name, v_variant.sku, v_variant.price, p_quantity, v_total,
    'bank_qr', 'pending', v_transaction_id,
    v_variant.inventory_policy = 'finite'
  );

  IF v_variant.inventory_policy = 'finite' THEN
    UPDATE product_variants
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_variant_id;
  END IF;

  IF array_length(v_key_ids, 1) IS NOT NULL THEN
    UPDATE product_keys SET reserved_order_id = v_order_id WHERE id = ANY(v_key_ids);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'transaction_id', v_transaction_id,
    'transaction_code', p_transaction_code,
    'amount', v_total,
    'expires_at', p_expires_at
  );
END;
$$;

-- ---------- Expire a QR and release reserved inventory ----------
CREATE OR REPLACE FUNCTION public.expire_payment_transaction(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy giao dịch');
  END IF;
  IF v_transaction.status <> 'pending' THEN
    RETURN jsonb_build_object('success', TRUE, 'status', v_transaction.status);
  END IF;
  IF v_transaction.expires_at IS NULL OR v_transaction.expires_at > NOW() THEN
    RETURN jsonb_build_object('success', TRUE, 'status', 'pending');
  END IF;

  UPDATE transactions SET status = 'expired' WHERE id = p_transaction_id;

  IF v_transaction.purpose = 'order' THEN
    SELECT * INTO v_order FROM orders
    WHERE transaction_id = p_transaction_id AND status = 'pending' FOR UPDATE;
    IF FOUND THEN
      IF v_order.inventory_reserved AND v_order.variant_id IS NOT NULL THEN
        UPDATE product_variants
        SET stock_quantity = stock_quantity + v_order.quantity
        WHERE id = v_order.variant_id;
      END IF;
      UPDATE product_keys SET reserved_order_id = NULL WHERE reserved_order_id = v_order.id;
      UPDATE orders SET status = 'failed', inventory_reserved = FALSE WHERE id = v_order.id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'status', 'expired');
END;
$$;

-- ---------- Complete recharge or bank order from a verified webhook ----------
CREATE OR REPLACE FUNCTION public.complete_payment_transaction(
  p_transaction_id UUID,
  p_received_amount BIGINT,
  p_provider_transaction_id TEXT,
  p_bank_ref TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_order orders%ROWTYPE;
  v_product products%ROWTYPE;
  v_variant product_variants%ROWTYPE;
  v_delivery JSONB := '[]'::JSONB;
  v_first_key TEXT;
  v_key_count INTEGER := 0;
BEGIN
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy giao dịch');
  END IF;
  IF v_transaction.status <> 'pending' THEN
    RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE, 'status', v_transaction.status);
  END IF;
  IF p_received_amount <> v_transaction.amount THEN
    RETURN jsonb_build_object(
      'success', FALSE, 'error', 'Số tiền không khớp',
      'expected', v_transaction.amount, 'received', p_received_amount
    );
  END IF;
  IF v_transaction.expires_at IS NOT NULL AND v_transaction.expires_at < NOW() THEN
    PERFORM public.expire_payment_transaction(p_transaction_id);
    RETURN jsonb_build_object('success', FALSE, 'error', 'Giao dịch đã hết hạn');
  END IF;

  IF v_transaction.purpose = 'recharge' THEN
    UPDATE user_profiles
    SET coin_balance = coin_balance + v_transaction.coin_amount,
        total_recharged = total_recharged + v_transaction.amount,
        updated_at = NOW()
    WHERE id = v_transaction.user_id;

    UPDATE transactions
    SET status = 'completed', bank_ref = p_bank_ref, sepay_data = p_payload,
        provider_transaction_id = p_provider_transaction_id, completed_at = NOW()
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object(
      'success', TRUE, 'purpose', 'recharge', 'user_id', v_transaction.user_id,
      'coin_amount', v_transaction.coin_amount,
      'transaction_code', v_transaction.transaction_code
    );
  END IF;

  SELECT * INTO v_order FROM orders
  WHERE transaction_id = p_transaction_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy đơn hàng chờ xử lý');
  END IF;
  SELECT * INTO v_product FROM products WHERE id = v_order.product_id;
  SELECT * INTO v_variant FROM product_variants WHERE id = v_order.variant_id;

  IF v_product.has_key THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('key', key_value, 'type', key_type)), '[]'::JSONB),
           MIN(key_value), COUNT(*)::INTEGER
    INTO v_delivery, v_first_key, v_key_count
    FROM product_keys
    WHERE reserved_order_id = v_order.id AND is_used = FALSE;

    IF v_key_count < v_order.quantity THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Kho key đã giữ không hợp lệ');
    END IF;

    UPDATE product_keys
    SET is_used = TRUE, used_by = v_order.user_id, used_at = NOW(),
        order_id = v_order.id, reserved_order_id = NULL
    WHERE reserved_order_id = v_order.id;
  ELSE
    v_delivery := jsonb_build_array(jsonb_build_object(
      'download_url', COALESCE(v_variant.download_url, v_product.download_url),
      'note', COALESCE(v_variant.delivery_note, v_product.delivery_note)
    ));
  END IF;

  UPDATE orders
  SET status = 'completed', key_value = v_first_key, delivery_data = v_delivery,
      inventory_reserved = FALSE, completed_at = NOW()
  WHERE id = v_order.id;

  UPDATE product_variants SET sold_count = sold_count + v_order.quantity
  WHERE id = v_order.variant_id;
  UPDATE products SET total_sold = total_sold + v_order.quantity
  WHERE id = v_order.product_id;

  UPDATE transactions
  SET status = 'completed', bank_ref = p_bank_ref, sepay_data = p_payload,
      provider_transaction_id = p_provider_transaction_id, completed_at = NOW()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', TRUE, 'purpose', 'order', 'user_id', v_order.user_id,
    'order_id', v_order.id, 'transaction_code', v_transaction.transaction_code,
    'delivery_data', v_delivery, 'key_value', v_first_key,
    'download_url', COALESCE(v_variant.download_url, v_product.download_url),
    'delivery_intro', v_product.delivery_intro,
    'delivery_note', COALESCE(v_variant.delivery_note, v_product.delivery_note),
    'product_title', v_product.title, 'variant_name', v_variant.name,
    'amount', v_order.amount
  );
END;
$$;

-- Keep commerce mutations server-only.
REVOKE ALL ON FUNCTION public.purchase_variant_with_wallet(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_bank_variant_purchase(UUID, UUID, INTEGER, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_payment_transaction(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_payment_transaction(UUID, BIGINT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.purchase_variant_with_wallet(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_bank_variant_purchase(UUID, UUID, INTEGER, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_payment_transaction(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment_transaction(UUID, BIGINT, TEXT, TEXT, JSONB) TO service_role;
GRANT ALL ON product_variants, payment_events TO service_role;
