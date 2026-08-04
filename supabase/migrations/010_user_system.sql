-- ==========================================================================
-- Migration 010: Hệ thống User, Đơn hàng, Thanh toán, Key sản phẩm
-- Chạy file này trong Supabase Dashboard > SQL Editor
-- ==========================================================================

-- ===== 1. BẢNG user_profiles (Mở rộng Supabase Auth) =====
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  coin_balance BIGINT NOT NULL DEFAULT 0,         -- 1 coin = 1 VND
  total_spent BIGINT NOT NULL DEFAULT 0,           -- Tổng đã chi (VND)
  total_recharged BIGINT NOT NULL DEFAULT 0,       -- Tổng đã nạp (VND)
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 2. BẢNG transactions (Lịch sử nạp tiền) =====
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,                          -- Số tiền VND
  coin_amount BIGINT NOT NULL,                     -- Số coin được cộng (= amount)
  status TEXT NOT NULL DEFAULT 'pending'           -- pending | completed | failed | expired
    CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  transaction_code TEXT UNIQUE NOT NULL,           -- Mã giao dịch duy nhất (dùng làm nội dung CK)
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  bank_ref TEXT,                                   -- Mã tham chiếu từ SePay/ngân hàng
  sepay_data JSONB,                                -- Dữ liệu raw từ SePay webhook
  expires_at TIMESTAMPTZ,                          -- Hết hạn sau 15 phút
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 3. BẢNG product_keys (Key bản quyền sản phẩm) =====
CREATE TABLE IF NOT EXISTS product_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL,
  key_type TEXT NOT NULL DEFAULT 'permanent'       -- trial | permanent
    CHECK (key_type IN ('trial', 'permanent')),
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES user_profiles(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 4. BẢNG orders (Đơn hàng) =====
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_title TEXT NOT NULL,                     -- Snapshot tên sản phẩm
  amount BIGINT NOT NULL,                          -- Số tiền thanh toán (VND)
  payment_method TEXT NOT NULL                     -- coin | bank_qr | free_trial
    CHECK (payment_method IN ('coin', 'bank_qr', 'free_trial')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  key_id UUID REFERENCES product_keys(id),         -- Key đã giao
  key_value TEXT,                                  -- Snapshot key value
  transaction_id UUID REFERENCES transactions(id), -- Giao dịch liên quan
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 5. BẢNG: Thêm cột mới vào products =====
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_key BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_note TEXT DEFAULT '',     -- Hướng dẫn sử dụng (Markdown)
  ADD COLUMN IF NOT EXISTS delivery_intro TEXT DEFAULT '',    -- Lời cảm ơn tùy chỉnh (2-5 dòng)
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS demo_url TEXT;

-- Tạo index cho slug nếu chưa có
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);
CREATE INDEX IF NOT EXISTS transactions_code_idx ON transactions(transaction_code);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS product_keys_product_idx ON product_keys(product_id);

-- ===== TRIGGERS =====
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== FUNCTION: Tự tạo user_profile khi signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== FUNCTION: Cộng coin khi transaction completed =====
CREATE OR REPLACE FUNCTION public.complete_transaction(
  p_transaction_id UUID,
  p_bank_ref TEXT DEFAULT NULL,
  p_sepay_data JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Lấy thông tin transaction
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already processed', 'status', v_transaction.status);
  END IF;
  
  -- Cập nhật transaction
  UPDATE transactions SET
    status = 'completed',
    bank_ref = p_bank_ref,
    sepay_data = p_sepay_data,
    completed_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Cộng coin vào ví user
  UPDATE user_profiles SET
    coin_balance = coin_balance + v_transaction.coin_amount,
    total_recharged = total_recharged + v_transaction.amount,
    updated_at = NOW()
  WHERE id = v_transaction.user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_transaction.user_id,
    'coin_amount', v_transaction.coin_amount,
    'transaction_code', v_transaction.transaction_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- user_profiles: user chỉ đọc/sửa profile của chính mình, admin đọc tất
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = id OR (SELECT is_admin FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- transactions: user chỉ xem của mình
CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (user_id = auth.uid() OR (SELECT is_admin FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "transactions_insert_own" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- orders: user chỉ xem của mình
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (user_id = auth.uid() OR (SELECT is_admin FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- product_keys: không cho user đọc trực tiếp (chỉ qua API)
CREATE POLICY "product_keys_admin_only" ON product_keys
  FOR ALL USING ((SELECT is_admin FROM user_profiles WHERE id = auth.uid()));

-- Cho phép service role (webhook) cập nhật tất cả
-- (service_role bypass RLS mặc định)

-- ===== SERVICE ROLE: Cần grant để webhook hoạt động =====
GRANT EXECUTE ON FUNCTION public.complete_transaction TO service_role;
GRANT ALL ON transactions TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON orders TO service_role;
GRANT ALL ON product_keys TO service_role;
