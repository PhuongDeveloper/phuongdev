-- ============================================================================
-- Migration 015: Tạo Ninja School JAR tức thì từ file mẫu đã build sẵn.
-- Không có worker/hàng đợi: API vá JAR + upload trước, sau đó mới trừ ví.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nso_builder_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  title TEXT NOT NULL DEFAULT 'Tạo phiên bản Ninja School của bạn',
  description TEXT NOT NULL DEFAULT 'Chọn phiên bản, nhập server và nhận game ngay.',
  content TEXT NOT NULL DEFAULT 'Game được chuẩn bị tự động theo server bạn cung cấp.',
  banner_url TEXT,
  badge TEXT NOT NULL DEFAULT 'TẠO TỨC THÌ',
  default_port INTEGER NOT NULL DEFAULT 14444 CHECK (default_port BETWEEN 1 AND 65535),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO nso_builder_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

UPDATE nso_builder_settings SET
  title = 'Tạo phiên bản Ninja School của bạn',
  description = 'Chọn phiên bản, nhập server và nhận game ngay.',
  content = 'Game được chuẩn bị tự động theo server bạn cung cấp.'
WHERE id = TRUE AND title = 'Build Ninja School theo server của bạn';

CREATE TABLE IF NOT EXISTS nso_build_versions (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-zA-Z0-9._-]{1,24}$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
  clone_bundle_price BIGINT NOT NULL DEFAULT 0 CHECK (clone_bundle_price >= 0),
  template_file TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nso_build_versions
  ADD COLUMN IF NOT EXISTS clone_bundle_price BIGINT NOT NULL DEFAULT 0 CHECK (clone_bundle_price >= 0);

INSERT INTO nso_build_versions (code, name, description, price, template_file, sort_order)
VALUES
  ('148', 'Ninja School 1.4.8', 'Bản JAR 1.4.8 +20, nhẹ và tương thích Java ME.', 0, '148.jar', 0),
  ('217', 'Ninja School 2.1.7', 'Bản JAR 2.1.7 +20, đã cấu hình obfuscation.', 0, '217.jar', 1)
ON CONFLICT (code) DO NOTHING;

-- Kênh client build sẵn. endpoint_slug chính là URL TXT mà client đọc danh sách server.
CREATE TABLE IF NOT EXISTS nso_platform_channels (
  id TEXT PRIMARY KEY CHECK (id ~ '^(apk|pc|ios)[a-zA-Z0-9._-]{1,24}$'),
  platform TEXT NOT NULL CHECK (platform IN ('apk', 'pc', 'ios')),
  version_code TEXT NOT NULL CHECK (version_code ~ '^[a-zA-Z0-9._-]{1,24}$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  endpoint_slug TEXT NOT NULL UNIQUE CHECK (endpoint_slug ~ '^(apk|pc|ios)[a-zA-Z0-9._-]{1,24}\.txt$'),
  download_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, version_code)
);

INSERT INTO nso_platform_channels (id, platform, version_code, name, description, endpoint_slug, sort_order)
VALUES
  ('apk148', 'apk', '148', 'APK 1.4.8', 'Client Android nhận danh sách server từ endpoint riêng.', 'apk148.txt', 0),
  ('apk217', 'apk', '217', 'APK 2.1.7', 'Client Android nhận danh sách server từ endpoint riêng.', 'apk217.txt', 1),
  ('pc148', 'pc', '148', 'PC 1.4.8', 'Client PC nhận danh sách server từ endpoint riêng.', 'pc148.txt', 2),
  ('pc217', 'pc', '217', 'PC 2.1.7', 'Client PC nhận danh sách server từ endpoint riêng.', 'pc217.txt', 3),
  ('ios148', 'ios', '148', 'iOS 1.4.8', 'Bản TestFlight thuê theo thời hạn.', 'ios148.txt', 4),
  ('ios217', 'ios', '217', 'iOS 2.1.7', 'Bản TestFlight thuê theo thời hạn.', 'ios217.txt', 5)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS nso_platform_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL REFERENCES nso_platform_channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 0 CHECK (duration_days >= 0),
  price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, duration_days)
);

INSERT INTO nso_platform_offers (channel_id, name, duration_days, price, is_active, sort_order)
SELECT channel.id, offer.name, offer.duration_days, 0, FALSE, offer.sort_order
FROM nso_platform_channels channel
CROSS JOIN LATERAL (
  SELECT 'Vĩnh viễn'::TEXT AS name, 0 AS duration_days, 0 AS sort_order
  WHERE channel.platform IN ('apk', 'pc')
  UNION ALL SELECT '1 tuần', 7, 0 WHERE channel.platform = 'ios'
  UNION ALL SELECT '1 tháng', 30, 1 WHERE channel.platform = 'ios'
  UNION ALL SELECT '3 tháng', 90, 2 WHERE channel.platform = 'ios'
) offer
ON CONFLICT (channel_id, duration_days) DO NOTHING;

CREATE TABLE IF NOT EXISTS nso_server_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES nso_platform_channels(id),
  server_name TEXT NOT NULL,
  server_host TEXT NOT NULL,
  server_port INTEGER NOT NULL CHECK (server_port BETWEEN 1 AND 65535),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TIMESTAMPTZ,
  total_paid BIGINT NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  purchase_count INTEGER NOT NULL DEFAULT 0 CHECK (purchase_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, channel_id, server_name, server_host, server_port)
);

CREATE TABLE IF NOT EXISTS nso_access_orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  access_id UUID NOT NULL REFERENCES nso_server_access(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES nso_platform_offers(id),
  price BIGINT NOT NULL CHECK (price >= 0),
  duration_days INTEGER NOT NULL CHECK (duration_days >= 0),
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS nso_server_access_channel_idx ON nso_server_access(channel_id, status, expires_at);
CREATE INDEX IF NOT EXISTS nso_server_access_user_idx ON nso_server_access(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nso_access_orders_user_created_idx ON nso_access_orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nso_build_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  version_code TEXT NOT NULL REFERENCES nso_build_versions(code),
  server_name TEXT NOT NULL,
  server_host TEXT NOT NULL,
  server_port INTEGER NOT NULL CHECK (server_port BETWEEN 1 AND 65535),
  price BIGINT NOT NULL CHECK (price >= 0),
  output_kind TEXT NOT NULL DEFAULT 'single' CHECK (output_kind IN ('single', 'clone_bundle')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status = 'completed'),
  idempotency_key UUID NOT NULL,
  output_path TEXT NOT NULL,
  output_name TEXT NOT NULL,
  output_size BIGINT NOT NULL CHECK (output_size > 0),
  built_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

-- Sản phẩm hệ thống dùng để đưa mọi giao dịch Ninja School vào chung sổ đơn
-- hàng/doanh thu. Bản ghi này bị ẩn khỏi catalogue; giá thật vẫn lấy từ cấu
-- hình phiên bản/gói NSO tại thời điểm mua.
INSERT INTO products (
  id, title, slug, description, content, price, category, is_active, has_key,
  sort_order, fulfillment_time, warranty_text
) VALUES (
  '00000000-0000-4000-8000-000000000015',
  'Tạo game Ninja School',
  'nso-builder-system',
  'Đơn hàng tạo phiên bản Ninja School theo server.',
  '', 0, 'ninja-school', FALSE, FALSE, 9999,
  'Tạo tự động sau thanh toán', 'Hỗ trợ kiểm tra file'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = FALSE,
  has_key = FALSE;

CREATE TABLE IF NOT EXISTS nso_payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  purchase_kind TEXT NOT NULL CHECK (purchase_kind IN ('jar', 'access')),
  version_code TEXT REFERENCES nso_build_versions(code),
  output_kind TEXT CHECK (output_kind IS NULL OR output_kind IN ('single', 'clone_bundle')),
  offer_id UUID REFERENCES nso_platform_offers(id),
  server_name TEXT NOT NULL,
  server_host TEXT NOT NULL,
  server_port INTEGER NOT NULL CHECK (server_port BETWEEN 1 AND 65535),
  idempotency_key UUID NOT NULL,
  price BIGINT NOT NULL CHECK (price > 0),
  job_id UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key),
  CHECK (
    (purchase_kind = 'jar' AND version_code IS NOT NULL AND output_kind IS NOT NULL AND offer_id IS NULL)
    OR (purchase_kind = 'access' AND version_code IS NULL AND output_kind IS NULL AND offer_id IS NOT NULL)
  )
);

ALTER TABLE nso_build_jobs
  ADD COLUMN IF NOT EXISTS output_kind TEXT NOT NULL DEFAULT 'single'
  CHECK (output_kind IN ('single', 'clone_bundle'));

CREATE INDEX IF NOT EXISTS nso_build_jobs_user_created_idx ON nso_build_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nso_payment_orders_user_created_idx ON nso_payment_orders(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_nso_builder_settings_updated_at ON nso_builder_settings;
CREATE TRIGGER trigger_nso_builder_settings_updated_at BEFORE UPDATE ON nso_builder_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_build_versions_updated_at ON nso_build_versions;
CREATE TRIGGER trigger_nso_build_versions_updated_at BEFORE UPDATE ON nso_build_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_build_jobs_updated_at ON nso_build_jobs;
CREATE TRIGGER trigger_nso_build_jobs_updated_at BEFORE UPDATE ON nso_build_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_payment_orders_updated_at ON nso_payment_orders;
CREATE TRIGGER trigger_nso_payment_orders_updated_at BEFORE UPDATE ON nso_payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_platform_channels_updated_at ON nso_platform_channels;
CREATE TRIGGER trigger_nso_platform_channels_updated_at BEFORE UPDATE ON nso_platform_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_platform_offers_updated_at ON nso_platform_offers;
CREATE TRIGGER trigger_nso_platform_offers_updated_at BEFORE UPDATE ON nso_platform_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_server_access_updated_at ON nso_server_access;
CREATE TRIGGER trigger_nso_server_access_updated_at BEFORE UPDATE ON nso_server_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE nso_builder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_build_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_build_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_platform_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_platform_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_server_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_access_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_nso_builder_settings" ON nso_builder_settings;
CREATE POLICY "public_read_nso_builder_settings" ON nso_builder_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "admin_manage_nso_builder_settings" ON nso_builder_settings;
CREATE POLICY "admin_manage_nso_builder_settings" ON nso_builder_settings FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS "public_read_active_nso_versions" ON nso_build_versions;
CREATE POLICY "public_read_active_nso_versions" ON nso_build_versions FOR SELECT
  USING (is_active = TRUE OR public.current_user_is_admin());
DROP POLICY IF EXISTS "admin_manage_nso_versions" ON nso_build_versions;
CREATE POLICY "admin_manage_nso_versions" ON nso_build_versions FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS "users_read_own_nso_jobs" ON nso_build_jobs;
CREATE POLICY "users_read_own_nso_jobs" ON nso_build_jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());
DROP POLICY IF EXISTS "public_read_active_nso_channels" ON nso_platform_channels;
CREATE POLICY "public_read_active_nso_channels" ON nso_platform_channels FOR SELECT
  USING (is_active = TRUE OR public.current_user_is_admin());
DROP POLICY IF EXISTS "admin_manage_nso_channels" ON nso_platform_channels;
CREATE POLICY "admin_manage_nso_channels" ON nso_platform_channels FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS "public_read_active_nso_offers" ON nso_platform_offers;
CREATE POLICY "public_read_active_nso_offers" ON nso_platform_offers FOR SELECT
  USING (is_active = TRUE OR public.current_user_is_admin());
DROP POLICY IF EXISTS "admin_manage_nso_offers" ON nso_platform_offers;
CREATE POLICY "admin_manage_nso_offers" ON nso_platform_offers FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS "users_read_own_nso_access" ON nso_server_access;
CREATE POLICY "users_read_own_nso_access" ON nso_server_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());
DROP POLICY IF EXISTS "users_read_own_nso_access_orders" ON nso_access_orders;
CREATE POLICY "users_read_own_nso_access_orders" ON nso_access_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());
DROP POLICY IF EXISTS "users_read_own_nso_payment_orders" ON nso_payment_orders;
CREATE POLICY "users_read_own_nso_payment_orders" ON nso_payment_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

REVOKE ALL ON nso_builder_settings, nso_build_versions, nso_build_jobs FROM anon, authenticated;
REVOKE ALL ON nso_platform_channels, nso_platform_offers, nso_server_access, nso_access_orders FROM anon, authenticated;
REVOKE ALL ON nso_payment_orders FROM anon, authenticated;
GRANT SELECT ON nso_builder_settings TO anon, authenticated;
GRANT SELECT (code, name, description, price, clone_bundle_price, is_active, sold_count, sort_order, created_at, updated_at)
  ON nso_build_versions TO anon, authenticated;
GRANT SELECT ON nso_build_jobs TO authenticated;
GRANT SELECT (id, platform, version_code, name, description, download_url, is_active, sort_order, created_at, updated_at)
  ON nso_platform_channels TO anon, authenticated;
GRANT SELECT (id, channel_id, name, duration_days, price, is_active, sort_order, created_at, updated_at)
  ON nso_platform_offers TO anon, authenticated;
GRANT SELECT ON nso_server_access, nso_access_orders TO authenticated;
GRANT SELECT ON nso_payment_orders TO authenticated;
GRANT ALL ON nso_builder_settings, nso_build_versions, nso_build_jobs, nso_platform_channels,
  nso_platform_offers, nso_server_access, nso_access_orders, nso_payment_orders TO service_role;

-- File đã được tạo và upload trước. Chỉ trừ ví + ghi lịch sử khi file sẵn sàng.
DROP FUNCTION IF EXISTS public.purchase_completed_nso_build(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT, BIGINT);
DROP FUNCTION IF EXISTS public.purchase_completed_nso_build(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT, TEXT, BIGINT);
CREATE OR REPLACE FUNCTION public.purchase_completed_nso_build(
  p_job_id UUID, p_user_id UUID, p_version_code TEXT, p_server_name TEXT,
  p_server_host TEXT, p_server_port INTEGER, p_idempotency_key UUID,
  p_output_kind TEXT, p_output_path TEXT, p_output_name TEXT, p_output_size BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version nso_build_versions%ROWTYPE;
  v_profile user_profiles%ROWTYPE;
  v_existing nso_build_jobs%ROWTYPE;
  v_settings nso_builder_settings%ROWTYPE;
  v_price BIGINT;
  v_name TEXT := btrim(p_server_name);
  v_host TEXT := lower(btrim(p_server_host));
BEGIN
  SELECT * INTO v_existing FROM nso_build_jobs
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', TRUE, 'job_id', v_existing.id,
      'price', v_existing.price, 'duplicate', TRUE, 'output_path', v_existing.output_path);
  END IF;

  SELECT * INTO v_settings FROM nso_builder_settings WHERE id = TRUE;
  IF NOT FOUND OR NOT v_settings.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Dịch vụ tạo JAR đang tạm dừng');
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 40 OR v_name ~ '[\x00-\x1F\\/:,*?"<>|]' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Tên server không hợp lệ');
  END IF;
  IF char_length(v_host) < 1 OR char_length(v_host) > 253
     OR v_host !~ '^(localhost|([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?))*|([0-9]{1,3}\.){3}[0-9]{1,3})$'
     OR (v_host ~ '^\d{1,3}(\.\d{1,3}){3}$' AND EXISTS (
       SELECT 1 FROM unnest(string_to_array(v_host, '.')) AS octet WHERE octet::INTEGER > 255
     )) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IP hoặc tên miền không hợp lệ');
  END IF;
  IF p_server_port < 1 OR p_server_port > 65535 OR p_output_size < 100000
     OR p_output_kind NOT IN ('single', 'clone_bundle') OR p_output_path = ''
     OR (p_output_kind = 'single' AND p_output_name !~ '^[a-zA-Z0-9._-]+\.jar$')
     OR (p_output_kind = 'clone_bundle' AND p_output_name !~ '^[a-zA-Z0-9._-]+\.zip$') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Thông tin file đầu ra không hợp lệ');
  END IF;

  SELECT * INTO v_version FROM nso_build_versions WHERE code = p_version_code FOR UPDATE;
  IF NOT FOUND OR NOT v_version.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Phiên bản không còn được bán');
  END IF;
  v_price := v_version.price + CASE WHEN p_output_kind = 'clone_bundle'
    THEN v_version.clone_bundle_price ELSE 0 END;
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy hồ sơ người dùng');
  END IF;
  IF (SELECT COUNT(*) FROM nso_build_jobs WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Bạn đã tạo quá nhiều file trong một giờ. Vui lòng thử lại sau');
  END IF;
  IF v_profile.coin_balance < v_price THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Số dư ví không đủ',
      'need_recharge', TRUE, 'balance', v_profile.coin_balance, 'required', v_price);
  END IF;

  UPDATE user_profiles SET coin_balance = coin_balance - v_price,
    total_spent = total_spent + v_price, updated_at = NOW() WHERE id = p_user_id;
  INSERT INTO nso_build_jobs (
    id, user_id, version_code, server_name, server_host, server_port, price, output_kind,
    idempotency_key, output_path, output_name, output_size
  ) VALUES (
    p_job_id, p_user_id, v_version.code, v_name, v_host, p_server_port, v_price, p_output_kind,
    p_idempotency_key, p_output_path, p_output_name, p_output_size
  );
  INSERT INTO orders (
    id, user_id, product_id, product_title, variant_name, sku, unit_price,
    quantity, amount, payment_method, status, delivery_data, completed_at
  ) VALUES (
    p_job_id, p_user_id, '00000000-0000-4000-8000-000000000015',
    'Tạo game Ninja School',
    v_version.name || CASE WHEN p_output_kind = 'clone_bundle' THEN ' · Trọn bộ x1–x24' ELSE ' · Bản thường' END,
    'NSO-JAR-' || upper(v_version.code) || CASE WHEN p_output_kind = 'clone_bundle' THEN '-FULL' ELSE '-X1' END,
    v_price, 1, v_price, CASE WHEN v_price = 0 THEN 'free_trial' ELSE 'coin' END,
    'completed', jsonb_build_array(jsonb_build_object(
      'type', 'nso_build', 'job_id', p_job_id,
      'download_url', '/api/nso-builder/jobs/' || p_job_id || '/download'
    )), NOW()
  );
  UPDATE nso_build_versions SET sold_count = sold_count + 1 WHERE code = v_version.code;
  UPDATE products SET total_sold = total_sold + 1
  WHERE id = '00000000-0000-4000-8000-000000000015';

  RETURN jsonb_build_object('success', TRUE, 'job_id', p_job_id, 'price', v_price,
    'order_id', p_job_id, 'new_balance', v_profile.coin_balance - v_price,
    'output_path', p_output_path);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_completed_nso_build(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT, TEXT, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_completed_nso_build(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT, TEXT, BIGINT)
  TO service_role;

-- Mua quyền xuất hiện trong endpoint APK/PC/iOS. iOS được gia hạn nối tiếp,
-- còn APK/PC vĩnh viễn không thu tiền lần hai cho cùng một server.
CREATE OR REPLACE FUNCTION public.purchase_nso_server_access(
  p_order_id UUID, p_user_id UUID, p_offer_id UUID, p_server_name TEXT,
  p_server_host TEXT, p_server_port INTEGER, p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer nso_platform_offers%ROWTYPE;
  v_channel nso_platform_channels%ROWTYPE;
  v_profile user_profiles%ROWTYPE;
  v_access nso_server_access%ROWTYPE;
  v_existing_order nso_access_orders%ROWTYPE;
  v_name TEXT := btrim(p_server_name);
  v_host TEXT := lower(btrim(p_server_host));
  v_expires_at TIMESTAMPTZ;
  v_access_found BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_existing_order FROM nso_access_orders
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    SELECT * INTO v_access FROM nso_server_access WHERE id = v_existing_order.access_id;
    SELECT * INTO v_channel FROM nso_platform_channels WHERE id = v_access.channel_id;
    RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE, 'access_id', v_access.id,
      'price', v_existing_order.price, 'expires_at', v_access.expires_at,
      'download_url', v_channel.download_url);
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 40 OR v_name ~ '[\x00-\x1F\\/:,*?"<>|]' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Tên server không hợp lệ');
  END IF;
  IF char_length(v_host) < 1 OR char_length(v_host) > 253
     OR v_host !~ '^(localhost|([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?))*|([0-9]{1,3}\.){3}[0-9]{1,3})$'
     OR (v_host ~ '^\d{1,3}(\.\d{1,3}){3}$' AND EXISTS (
       SELECT 1 FROM unnest(string_to_array(v_host, '.')) AS octet WHERE octet::INTEGER > 255
     )) OR p_server_port < 1 OR p_server_port > 65535 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IP, tên miền hoặc port không hợp lệ');
  END IF;

  SELECT * INTO v_offer FROM nso_platform_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR NOT v_offer.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói này đang tạm dừng');
  END IF;
  SELECT * INTO v_channel FROM nso_platform_channels WHERE id = v_offer.channel_id FOR UPDATE;
  IF NOT FOUND OR NOT v_channel.is_active OR COALESCE(btrim(v_channel.download_url), '') = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Bản tải này chưa sẵn sàng');
  END IF;
  IF (v_channel.platform = 'ios' AND v_offer.duration_days = 0)
     OR (v_channel.platform IN ('apk', 'pc') AND v_offer.duration_days <> 0) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Thời hạn gói không hợp lệ');
  END IF;
  IF (SELECT COUNT(*) FROM nso_access_orders WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour') >= 20 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Bạn đã tạo quá nhiều yêu cầu trong một giờ');
  END IF;

  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy hồ sơ người dùng');
  END IF;
  IF v_profile.coin_balance < v_offer.price THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Số dư ví không đủ',
      'need_recharge', TRUE, 'balance', v_profile.coin_balance, 'required', v_offer.price);
  END IF;

  SELECT * INTO v_access FROM nso_server_access
  WHERE user_id = p_user_id AND channel_id = v_channel.id AND server_name = v_name
    AND server_host = v_host AND server_port = p_server_port
  FOR UPDATE;
  v_access_found := FOUND;

  IF v_access_found AND v_offer.duration_days = 0 AND v_access.status = 'active' AND v_access.expires_at IS NULL THEN
    RETURN jsonb_build_object('success', FALSE,
      'error', 'Server này đã có quyền vĩnh viễn trên bản tải đã chọn');
  END IF;

  IF v_offer.duration_days = 0 THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := GREATEST(COALESCE(v_access.expires_at, NOW()), NOW())
      + make_interval(days => v_offer.duration_days);
  END IF;

  UPDATE user_profiles SET coin_balance = coin_balance - v_offer.price,
    total_spent = total_spent + v_offer.price, updated_at = NOW() WHERE id = p_user_id;

  IF v_access_found THEN
    UPDATE nso_server_access SET status = 'active', expires_at = v_expires_at,
      total_paid = total_paid + v_offer.price, purchase_count = purchase_count + 1,
      updated_at = NOW() WHERE id = v_access.id RETURNING * INTO v_access;
  ELSE
    INSERT INTO nso_server_access (
      user_id, channel_id, server_name, server_host, server_port, expires_at,
      total_paid, purchase_count
    ) VALUES (
      p_user_id, v_channel.id, v_name, v_host, p_server_port, v_expires_at,
      v_offer.price, 1
    ) RETURNING * INTO v_access;
  END IF;

  INSERT INTO nso_access_orders (id, user_id, access_id, offer_id, price, duration_days, idempotency_key)
  VALUES (p_order_id, p_user_id, v_access.id, v_offer.id, v_offer.price,
    v_offer.duration_days, p_idempotency_key);

  INSERT INTO orders (
    id, user_id, product_id, product_title, variant_name, sku, unit_price,
    quantity, amount, payment_method, status, delivery_data, completed_at
  ) VALUES (
    p_order_id, p_user_id, '00000000-0000-4000-8000-000000000015',
    'Tạo game Ninja School', v_channel.name || ' · ' || v_offer.name,
    'NSO-' || upper(v_channel.platform) || '-' || upper(v_channel.version_code),
    v_offer.price, 1, v_offer.price,
    CASE WHEN v_offer.price = 0 THEN 'free_trial' ELSE 'coin' END,
    'completed', jsonb_build_array(jsonb_build_object(
      'type', 'nso_access', 'access_id', v_access.id,
      'download_url', v_channel.download_url
    )), NOW()
  );
  UPDATE products SET total_sold = total_sold + 1
  WHERE id = '00000000-0000-4000-8000-000000000015';

  RETURN jsonb_build_object('success', TRUE, 'access_id', v_access.id,
    'order_id', p_order_id, 'price', v_offer.price,
    'new_balance', v_profile.coin_balance - v_offer.price,
    'expires_at', v_access.expires_at, 'download_url', v_channel.download_url);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_nso_server_access(UUID, UUID, UUID, TEXT, TEXT, INTEGER, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_nso_server_access(UUID, UUID, UUID, TEXT, TEXT, INTEGER, UUID)
  TO service_role;

-- Tạo đơn QR trực tiếp cho JAR hoặc APK/PC/iOS. Tiền chưa được ghi nhận cho
-- đến khi bộ đối soát ngân hàng hoàn tất transaction tương ứng.
DROP FUNCTION IF EXISTS public.create_nso_bank_purchase(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, UUID, TEXT, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.create_nso_bank_purchase(
  p_user_id UUID, p_purchase_kind TEXT, p_version_code TEXT, p_output_kind TEXT,
  p_offer_id UUID, p_server_name TEXT, p_server_host TEXT, p_server_port INTEGER,
  p_idempotency_key UUID, p_transaction_code TEXT, p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version nso_build_versions%ROWTYPE;
  v_offer nso_platform_offers%ROWTYPE;
  v_channel nso_platform_channels%ROWTYPE;
  v_existing nso_payment_orders%ROWTYPE;
  v_profile user_profiles%ROWTYPE;
  v_transaction_id UUID := gen_random_uuid();
  v_order_id UUID := gen_random_uuid();
  v_payment_id UUID := gen_random_uuid();
  v_price BIGINT;
  v_variant_name TEXT;
  v_sku TEXT;
  v_name TEXT := btrim(p_server_name);
  v_host TEXT := lower(btrim(p_server_host));
BEGIN
  SELECT * INTO v_existing FROM nso_payment_orders
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', TRUE, 'duplicate', TRUE, 'payment_id', v_existing.id,
      'transaction_id', v_existing.transaction_id, 'order_id', v_existing.order_id,
      'amount', v_existing.price,
      'transaction_code', (SELECT transaction_code FROM transactions WHERE id = v_existing.transaction_id),
      'expires_at', (SELECT expires_at FROM transactions WHERE id = v_existing.transaction_id)
    );
  END IF;

  IF p_purchase_kind NOT IN ('jar', 'access') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Loại đơn không hợp lệ');
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 40 OR v_name ~ '[\x00-\x1F\\/:,*?"<>|]' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Tên server không hợp lệ');
  END IF;
  IF char_length(v_host) < 1 OR char_length(v_host) > 253
     OR v_host !~ '^(localhost|([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?))*|([0-9]{1,3}\.){3}[0-9]{1,3})$'
     OR (v_host ~ '^\d{1,3}(\.\d{1,3}){3}$' AND EXISTS (
       SELECT 1 FROM unnest(string_to_array(v_host, '.')) AS octet WHERE octet::INTEGER > 255
     )) OR p_server_port < 1 OR p_server_port > 65535 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IP, tên miền hoặc port không hợp lệ');
  END IF;

  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy hồ sơ người dùng');
  END IF;
  IF (SELECT COUNT(*) FROM nso_payment_orders WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Bạn đã tạo quá nhiều mã thanh toán trong một giờ');
  END IF;

  IF p_purchase_kind = 'jar' THEN
    IF p_output_kind NOT IN ('single', 'clone_bundle') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Gói JAR không hợp lệ');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM nso_builder_settings WHERE id = TRUE AND is_active = TRUE) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Dịch vụ tạo JAR đang tạm dừng');
    END IF;
    SELECT * INTO v_version FROM nso_build_versions
    WHERE code = p_version_code AND is_active = TRUE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Phiên bản không còn được bán');
    END IF;
    v_price := v_version.price + CASE WHEN p_output_kind = 'clone_bundle'
      THEN v_version.clone_bundle_price ELSE 0 END;
    v_variant_name := v_version.name || CASE WHEN p_output_kind = 'clone_bundle'
      THEN ' · Trọn bộ x1–x24' ELSE ' · Bản thường' END;
    v_sku := 'NSO-JAR-' || upper(v_version.code) || CASE WHEN p_output_kind = 'clone_bundle'
      THEN '-FULL' ELSE '-X1' END;
  ELSE
    SELECT * INTO v_offer FROM nso_platform_offers WHERE id = p_offer_id AND is_active = TRUE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Gói này đang tạm dừng');
    END IF;
    SELECT * INTO v_channel FROM nso_platform_channels
    WHERE id = v_offer.channel_id AND is_active = TRUE;
    IF NOT FOUND OR COALESCE(btrim(v_channel.download_url), '') = '' THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Bản tải này chưa sẵn sàng');
    END IF;
    IF v_offer.duration_days = 0 AND EXISTS (
      SELECT 1 FROM nso_server_access WHERE user_id = p_user_id
        AND channel_id = v_channel.id AND server_name = v_name
        AND server_host = v_host AND server_port = p_server_port
        AND status = 'active' AND expires_at IS NULL
    ) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Server này đã có quyền vĩnh viễn');
    END IF;
    v_price := v_offer.price;
    v_variant_name := v_channel.name || ' · ' || v_offer.name;
    v_sku := 'NSO-' || upper(v_channel.platform) || '-' || upper(v_channel.version_code);
  END IF;

  IF v_price <= 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gói miễn phí không cần thanh toán QR');
  END IF;

  INSERT INTO transactions (
    id, user_id, amount, coin_amount, status, transaction_code,
    payment_method, purpose, expires_at
  ) VALUES (
    v_transaction_id, p_user_id, v_price, 0, 'pending', p_transaction_code,
    'bank_qr', 'order', p_expires_at
  );
  INSERT INTO orders (
    id, user_id, product_id, product_title, variant_name, sku, unit_price,
    quantity, amount, payment_method, status, transaction_id, delivery_data
  ) VALUES (
    v_order_id, p_user_id, '00000000-0000-4000-8000-000000000015',
    'Tạo game Ninja School', v_variant_name, v_sku, v_price, 1, v_price,
    'bank_qr', 'pending', v_transaction_id, '[]'::JSONB
  );
  INSERT INTO nso_payment_orders (
    id, transaction_id, order_id, user_id, purchase_kind, version_code,
    output_kind, offer_id, server_name, server_host, server_port,
    idempotency_key, price
  ) VALUES (
    v_payment_id, v_transaction_id, v_order_id, p_user_id, p_purchase_kind,
    CASE WHEN p_purchase_kind = 'jar' THEN p_version_code ELSE NULL END,
    CASE WHEN p_purchase_kind = 'jar' THEN p_output_kind ELSE NULL END,
    CASE WHEN p_purchase_kind = 'access' THEN p_offer_id ELSE NULL END,
    v_name, v_host, p_server_port, p_idempotency_key, v_price
  );

  RETURN jsonb_build_object(
    'success', TRUE, 'payment_id', v_payment_id, 'transaction_id', v_transaction_id,
    'order_id', v_order_id, 'transaction_code', p_transaction_code,
    'amount', v_price, 'expires_at', p_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_nso_bank_purchase(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, UUID, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_nso_bank_purchase(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, UUID, TEXT, TIMESTAMPTZ)
  TO service_role;

-- Hoàn tất phần bàn giao sau khi complete_payment_transaction đã xác nhận tiền.
-- JAR được build trong API rồi truyền metadata file vào đây; quyền APK/PC/iOS
-- được cấp hoàn toàn trong transaction này.
DROP FUNCTION IF EXISTS public.finalize_nso_bank_purchase(UUID, TEXT, TEXT, BIGINT);
CREATE OR REPLACE FUNCTION public.finalize_nso_bank_purchase(
  p_transaction_id UUID, p_output_path TEXT DEFAULT NULL,
  p_output_name TEXT DEFAULT NULL, p_output_size BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment nso_payment_orders%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_order orders%ROWTYPE;
  v_version nso_build_versions%ROWTYPE;
  v_offer nso_platform_offers%ROWTYPE;
  v_channel nso_platform_channels%ROWTYPE;
  v_access nso_server_access%ROWTYPE;
  v_access_found BOOLEAN := FALSE;
  v_expires_at TIMESTAMPTZ;
  v_delivery JSONB;
  v_download_url TEXT;
BEGIN
  SELECT * INTO v_payment FROM nso_payment_orders
  WHERE transaction_id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy đơn Ninja School');
  END IF;
  SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy đơn hàng');
  END IF;
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', TRUE, 'duplicate', TRUE, 'order_id', v_order.id,
      'job_id', CASE WHEN v_payment.purchase_kind = 'jar' THEN v_payment.job_id ELSE NULL END,
      'delivery_data', v_order.delivery_data
    );
  END IF;
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_transaction.status <> 'completed' OR v_transaction.purpose <> 'order' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Giao dịch chưa được xác nhận');
  END IF;
  IF v_order.status <> 'completed' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Đơn hàng chưa được thanh toán');
  END IF;

  IF v_payment.purchase_kind = 'jar' THEN
    IF COALESCE(p_output_path, '') = '' OR COALESCE(p_output_name, '') = '' OR p_output_size < 100000
       OR (v_payment.output_kind = 'single' AND p_output_name !~ '^[a-zA-Z0-9._-]+\.jar$')
       OR (v_payment.output_kind = 'clone_bundle' AND p_output_name !~ '^[a-zA-Z0-9._-]+\.zip$') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'File bàn giao không hợp lệ');
    END IF;
    SELECT * INTO v_version FROM nso_build_versions WHERE code = v_payment.version_code;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy phiên bản đã mua');
    END IF;
    INSERT INTO nso_build_jobs (
      id, user_id, version_code, server_name, server_host, server_port, price,
      output_kind, idempotency_key, output_path, output_name, output_size
    ) VALUES (
      v_payment.job_id, v_payment.user_id, v_payment.version_code,
      v_payment.server_name, v_payment.server_host, v_payment.server_port,
      v_payment.price, v_payment.output_kind, v_payment.idempotency_key,
      p_output_path, p_output_name, p_output_size
    ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;
    UPDATE nso_build_versions SET sold_count = sold_count + 1
    WHERE code = v_payment.version_code;
    v_download_url := '/api/nso-builder/jobs/' || v_payment.job_id || '/download';
    v_delivery := jsonb_build_array(jsonb_build_object(
      'type', 'nso_build', 'job_id', v_payment.job_id, 'download_url', v_download_url
    ));
  ELSE
    SELECT * INTO v_offer FROM nso_platform_offers WHERE id = v_payment.offer_id;
    SELECT * INTO v_channel FROM nso_platform_channels WHERE id = v_offer.channel_id;
    IF NOT FOUND OR COALESCE(btrim(v_channel.download_url), '') = '' THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Bản tải đã mua chưa sẵn sàng');
    END IF;
    SELECT * INTO v_access FROM nso_server_access
    WHERE user_id = v_payment.user_id AND channel_id = v_channel.id
      AND server_name = v_payment.server_name AND server_host = v_payment.server_host
      AND server_port = v_payment.server_port FOR UPDATE;
    v_access_found := FOUND;
    IF v_offer.duration_days = 0 THEN
      v_expires_at := NULL;
    ELSE
      v_expires_at := GREATEST(COALESCE(v_access.expires_at, NOW()), NOW())
        + make_interval(days => v_offer.duration_days);
    END IF;
    IF v_access_found THEN
      UPDATE nso_server_access SET status = 'active', expires_at = v_expires_at,
        total_paid = total_paid + v_payment.price, purchase_count = purchase_count + 1,
        updated_at = NOW() WHERE id = v_access.id RETURNING * INTO v_access;
    ELSE
      INSERT INTO nso_server_access (
        user_id, channel_id, server_name, server_host, server_port, expires_at,
        total_paid, purchase_count
      ) VALUES (
        v_payment.user_id, v_channel.id, v_payment.server_name, v_payment.server_host,
        v_payment.server_port, v_expires_at, v_payment.price, 1
      ) RETURNING * INTO v_access;
    END IF;
    INSERT INTO nso_access_orders (
      id, user_id, access_id, offer_id, price, duration_days, idempotency_key
    ) VALUES (
      v_payment.order_id, v_payment.user_id, v_access.id, v_offer.id,
      v_payment.price, v_offer.duration_days, v_payment.idempotency_key
    ) ON CONFLICT (user_id, idempotency_key) DO NOTHING;
    v_download_url := v_channel.download_url;
    v_delivery := jsonb_build_array(jsonb_build_object(
      'type', 'nso_access', 'access_id', v_access.id, 'download_url', v_download_url
    ));
  END IF;

  UPDATE orders SET delivery_data = v_delivery, completed_at = COALESCE(completed_at, NOW())
  WHERE id = v_payment.order_id;
  UPDATE nso_payment_orders SET status = 'completed' WHERE id = v_payment.id;
  UPDATE user_profiles SET total_spent = total_spent + v_payment.price, updated_at = NOW()
  WHERE id = v_payment.user_id;

  RETURN jsonb_build_object(
    'success', TRUE, 'purpose', 'order', 'order_id', v_payment.order_id,
    'job_id', CASE WHEN v_payment.purchase_kind = 'jar' THEN v_payment.job_id ELSE NULL END,
    'access_id', CASE WHEN v_payment.purchase_kind = 'access' THEN v_access.id ELSE NULL END,
    'download_url', v_download_url, 'delivery_data', v_delivery,
    'product_title', 'Tạo game Ninja School', 'variant_name', v_order.variant_name,
    'amount', v_payment.price, 'user_id', v_payment.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_nso_bank_purchase(UUID, TEXT, TEXT, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_nso_bank_purchase(UUID, TEXT, TEXT, BIGINT)
  TO service_role;

-- Đồng bộ trạng thái mã QR bị hết hạn/thất bại vào hàng đợi NSO.
CREATE OR REPLACE FUNCTION public.sync_nso_payment_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('expired', 'failed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE nso_payment_orders SET status = NEW.status
    WHERE transaction_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_sync_nso_payment_order_status ON transactions;
CREATE TRIGGER trigger_sync_nso_payment_order_status
  AFTER UPDATE OF status ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_nso_payment_order_status();

-- Đưa cả các lượt đã tạo trước migration này vào lịch sử đơn hàng để doanh
-- thu cũ không bị mất khỏi dashboard.
INSERT INTO orders (
  id, user_id, product_id, product_title, variant_name, sku, unit_price,
  quantity, amount, payment_method, status, delivery_data, completed_at, created_at
)
SELECT
  job.id, job.user_id, '00000000-0000-4000-8000-000000000015',
  'Tạo game Ninja School', version.name || CASE WHEN job.output_kind = 'clone_bundle'
    THEN ' · Trọn bộ x1–x24' ELSE ' · Bản thường' END,
  'NSO-JAR-' || upper(job.version_code) || CASE WHEN job.output_kind = 'clone_bundle'
    THEN '-FULL' ELSE '-X1' END,
  job.price, 1, job.price, CASE WHEN job.price = 0 THEN 'free_trial' ELSE 'coin' END,
  'completed', jsonb_build_array(jsonb_build_object(
    'type', 'nso_build', 'job_id', job.id,
    'download_url', '/api/nso-builder/jobs/' || job.id || '/download'
  )), job.built_at, job.created_at
FROM nso_build_jobs job
JOIN nso_build_versions version ON version.code = job.version_code
WHERE NOT EXISTS (SELECT 1 FROM orders existing WHERE existing.id = job.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (
  id, user_id, product_id, product_title, variant_name, sku, unit_price,
  quantity, amount, payment_method, status, delivery_data, completed_at, created_at
)
SELECT
  access_order.id, access_order.user_id, '00000000-0000-4000-8000-000000000015',
  'Tạo game Ninja School', channel.name || ' · ' || offer.name,
  'NSO-' || upper(channel.platform) || '-' || upper(channel.version_code),
  access_order.price, 1, access_order.price,
  CASE WHEN access_order.price = 0 THEN 'free_trial' ELSE 'coin' END,
  'completed', jsonb_build_array(jsonb_build_object(
    'type', 'nso_access', 'access_id', access_order.access_id,
    'download_url', channel.download_url
  )), access_order.created_at, access_order.created_at
FROM nso_access_orders access_order
JOIN nso_platform_offers offer ON offer.id = access_order.offer_id
JOIN nso_platform_channels channel ON channel.id = offer.channel_id
WHERE NOT EXISTS (SELECT 1 FROM orders existing WHERE existing.id = access_order.id)
ON CONFLICT (id) DO NOTHING;

UPDATE products SET total_sold = (
  SELECT COUNT(*)::INTEGER FROM orders
  WHERE product_id = '00000000-0000-4000-8000-000000000015' AND status = 'completed'
)
WHERE id = '00000000-0000-4000-8000-000000000015';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nso-builds', 'nso-builds', FALSE, 67108864, ARRAY['application/java-archive', 'application/zip', 'application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 67108864,
  allowed_mime_types = ARRAY['application/java-archive', 'application/zip', 'application/octet-stream'];
