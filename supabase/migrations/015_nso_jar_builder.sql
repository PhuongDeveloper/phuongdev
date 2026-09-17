-- ============================================================================
-- Migration 015: Tạo Ninja School JAR tức thì từ file mẫu đã build sẵn.
-- Không có worker/hàng đợi: API vá JAR + upload trước, sau đó mới trừ ví.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nso_builder_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  title TEXT NOT NULL DEFAULT 'Build Ninja School theo server của bạn',
  description TEXT NOT NULL DEFAULT 'Nhập tên server, địa chỉ kết nối và nhận ngay client JAR được đóng gói riêng.',
  content TEXT NOT NULL DEFAULT 'Client được tạo tức thì từ bản mẫu đã kiểm thử. Mỗi file chỉ chứa cấu hình server bạn cung cấp.',
  banner_url TEXT,
  badge TEXT NOT NULL DEFAULT 'TẠO TỨC THÌ',
  default_port INTEGER NOT NULL DEFAULT 14444 CHECK (default_port BETWEEN 1 AND 65535),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO nso_builder_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS nso_build_versions (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-zA-Z0-9._-]{1,24}$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
  template_file TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO nso_build_versions (code, name, description, price, template_file, sort_order)
VALUES
  ('148', 'Ninja School 1.4.8', 'Bản JAR 1.4.8 +20, nhẹ và tương thích Java ME.', 0, '148.jar', 0),
  ('217', 'Ninja School 2.1.7', 'Bản JAR 2.1.7 +20, đã cấu hình obfuscation.', 0, '217.jar', 1)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS nso_build_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  version_code TEXT NOT NULL REFERENCES nso_build_versions(code),
  server_name TEXT NOT NULL,
  server_host TEXT NOT NULL,
  server_port INTEGER NOT NULL CHECK (server_port BETWEEN 1 AND 65535),
  price BIGINT NOT NULL CHECK (price >= 0),
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

CREATE INDEX IF NOT EXISTS nso_build_jobs_user_created_idx ON nso_build_jobs(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_nso_builder_settings_updated_at ON nso_builder_settings;
CREATE TRIGGER trigger_nso_builder_settings_updated_at BEFORE UPDATE ON nso_builder_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_build_versions_updated_at ON nso_build_versions;
CREATE TRIGGER trigger_nso_build_versions_updated_at BEFORE UPDATE ON nso_build_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_nso_build_jobs_updated_at ON nso_build_jobs;
CREATE TRIGGER trigger_nso_build_jobs_updated_at BEFORE UPDATE ON nso_build_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE nso_builder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_build_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nso_build_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_nso_builder_settings" ON nso_builder_settings FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_nso_builder_settings" ON nso_builder_settings FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "public_read_active_nso_versions" ON nso_build_versions FOR SELECT
  USING (is_active = TRUE OR public.current_user_is_admin());
CREATE POLICY "admin_manage_nso_versions" ON nso_build_versions FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "users_read_own_nso_jobs" ON nso_build_jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

REVOKE ALL ON nso_builder_settings, nso_build_versions, nso_build_jobs FROM anon, authenticated;
GRANT SELECT ON nso_builder_settings TO anon, authenticated;
GRANT SELECT (code, name, description, price, is_active, sold_count, sort_order, created_at, updated_at)
  ON nso_build_versions TO anon, authenticated;
GRANT SELECT ON nso_build_jobs TO authenticated;
GRANT ALL ON nso_builder_settings, nso_build_versions, nso_build_jobs TO service_role;

-- File đã được tạo và upload trước. Chỉ trừ ví + ghi lịch sử khi file sẵn sàng.
CREATE OR REPLACE FUNCTION public.purchase_completed_nso_build(
  p_job_id UUID, p_user_id UUID, p_version_code TEXT, p_server_name TEXT,
  p_server_host TEXT, p_server_port INTEGER, p_idempotency_key UUID,
  p_output_path TEXT, p_output_name TEXT, p_output_size BIGINT
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
  IF char_length(v_name) < 2 OR char_length(v_name) > 40 OR v_name ~ '[\x00-\x1F\\/:*?"<>|]' THEN
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
     OR p_output_path = '' OR p_output_name !~ '^[a-zA-Z0-9._-]+\.jar$' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Thông tin file đầu ra không hợp lệ');
  END IF;

  SELECT * INTO v_version FROM nso_build_versions WHERE code = p_version_code FOR UPDATE;
  IF NOT FOUND OR NOT v_version.is_active THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Phiên bản không còn được bán');
  END IF;
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy hồ sơ người dùng');
  END IF;
  IF (SELECT COUNT(*) FROM nso_build_jobs WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '1 hour') >= 10 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Bạn đã tạo quá nhiều file trong một giờ. Vui lòng thử lại sau');
  END IF;
  IF v_profile.coin_balance < v_version.price THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Số dư ví không đủ',
      'need_recharge', TRUE, 'balance', v_profile.coin_balance, 'required', v_version.price);
  END IF;

  UPDATE user_profiles SET coin_balance = coin_balance - v_version.price,
    total_spent = total_spent + v_version.price, updated_at = NOW() WHERE id = p_user_id;
  INSERT INTO nso_build_jobs (
    id, user_id, version_code, server_name, server_host, server_port, price,
    idempotency_key, output_path, output_name, output_size
  ) VALUES (
    p_job_id, p_user_id, v_version.code, v_name, v_host, p_server_port, v_version.price,
    p_idempotency_key, p_output_path, p_output_name, p_output_size
  );
  UPDATE nso_build_versions SET sold_count = sold_count + 1 WHERE code = v_version.code;

  RETURN jsonb_build_object('success', TRUE, 'job_id', p_job_id, 'price', v_version.price,
    'new_balance', v_profile.coin_balance - v_version.price, 'output_path', p_output_path);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_completed_nso_build(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_completed_nso_build(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT, BIGINT)
  TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nso-builds', 'nso-builds', FALSE, 10485760, ARRAY['application/java-archive', 'application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 10485760;
