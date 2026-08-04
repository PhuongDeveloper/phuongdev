-- =============================================================================
-- Migration 012: Fix payment RLS + ensure all grants are correct
-- Chạy file này trong Supabase Dashboard > SQL Editor
-- =============================================================================

-- Đảm bảo column purpose tồn tại (idempotent)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'recharge'
    CHECK (purpose IN ('recharge', 'order')),
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_provider_id_unique
  ON transactions(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- Đảm bảo bảng payment_events tồn tại
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

-- Bật RLS cho payment_events nếu chưa bật
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Đảm bảo service_role có đủ quyền trên tất cả bảng liên quan
GRANT ALL ON transactions      TO service_role;
GRANT ALL ON payment_events    TO service_role;
GRANT ALL ON user_profiles     TO service_role;
GRANT ALL ON orders            TO service_role;
GRANT ALL ON product_keys      TO service_role;
GRANT ALL ON product_variants  TO service_role;

-- Cấp quyền SELECT trên sequences liên quan (nếu cần)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Tạo lại policy INSERT cho transactions (đã bị drop ở migration 011)
-- Service role bypass RLS, nhưng cần policy để authenticated user có thể
-- đọc transaction của chính mình (SELECT) - INSERT luôn qua service_role
DROP POLICY IF EXISTS "transactions_select_own"  ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own"  ON transactions;
DROP POLICY IF EXISTS "transactions_admin_all"   ON transactions;

CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (user_id = auth.uid());

-- Admin có thể xem tất cả transactions
DROP POLICY IF EXISTS "transactions_admin_select" ON transactions;
CREATE POLICY "transactions_admin_select" ON transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Đảm bảo RPC functions có đủ grant
GRANT EXECUTE ON FUNCTION public.complete_payment_transaction(UUID, BIGINT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_payment_transaction(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_variant_with_wallet(UUID, UUID, INTEGER)             TO service_role;
GRANT EXECUTE ON FUNCTION public.create_bank_variant_purchase(UUID, UUID, INTEGER, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_transaction(UUID, TEXT, JSONB)                       TO service_role;
