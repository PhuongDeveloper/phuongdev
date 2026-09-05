-- =============================================================================
-- Migration 013: Featured products, manual recharge support and event cleanup
-- Run after 012_fix_payment_rls.sql.
-- =============================================================================

-- Normalize the homepage to exactly three active featured products (or fewer
-- when the catalogue has fewer than three). Existing featured items win first;
-- the admin can change the selection/order afterwards.
WITH selected AS (
  SELECT id
  FROM products
  WHERE is_active = TRUE
  ORDER BY is_featured DESC, sort_order ASC, created_at DESC
  LIMIT 3
)
UPDATE products AS product
SET is_featured = EXISTS (SELECT 1 FROM selected WHERE selected.id = product.id)
WHERE product.is_active = TRUE;

-- Keep cleanup queries cheap as the payment event table grows.
CREATE INDEX IF NOT EXISTS payment_events_cleanup_idx
  ON payment_events(status, created_at);

-- Duyệt nạp thủ công theo cùng một transaction DB, kể cả QR đã hết hạn.
-- Chỉ service_role (route admin phía server) được phép gọi hàm này.
CREATE OR REPLACE FUNCTION public.manual_complete_recharge(
  p_transaction_id UUID,
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
  v_profile user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy giao dịch');
  END IF;
  IF v_transaction.purpose <> 'recharge' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Chỉ có thể duyệt giao dịch nạp ví');
  END IF;
  IF v_transaction.status = 'completed' THEN
    RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE, 'status', 'completed');
  END IF;
  IF v_transaction.status NOT IN ('pending', 'expired') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Giao dịch không còn chờ duyệt');
  END IF;
  IF COALESCE(NULLIF(TRIM(p_provider_transaction_id), ''), '') = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Thiếu mã đối soát thủ công');
  END IF;

  SELECT * INTO v_profile
  FROM user_profiles
  WHERE id = v_transaction.user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Không tìm thấy hồ sơ người dùng');
  END IF;

  UPDATE user_profiles
  SET coin_balance = coin_balance + v_transaction.coin_amount,
      total_recharged = total_recharged + v_transaction.amount,
      updated_at = NOW()
  WHERE id = v_transaction.user_id;

  UPDATE transactions
  SET status = 'completed',
      bank_ref = p_bank_ref,
      sepay_data = p_payload,
      provider_transaction_id = p_provider_transaction_id,
      completed_at = NOW()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'purpose', 'recharge',
    'user_id', v_transaction.user_id,
    'coin_amount', v_transaction.coin_amount,
    'transaction_code', v_transaction.transaction_code,
    'new_balance', v_profile.coin_balance + v_transaction.coin_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manual_complete_recharge(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_complete_recharge(UUID, TEXT, TEXT, JSONB) TO service_role;
