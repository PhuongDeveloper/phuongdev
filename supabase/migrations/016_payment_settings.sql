CREATE TABLE IF NOT EXISTS payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  bank_id TEXT NOT NULL DEFAULT 'ACB',
  account_number TEXT NOT NULL DEFAULT '28049351',
  account_name TEXT NOT NULL DEFAULT 'TRAN MINH PHUONG',
  api_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payment_settings (id, bank_id, account_number, account_name, api_url)
VALUES (TRUE, 'ACB', '28049351', 'TRAN MINH PHUONG', '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON payment_settings TO service_role;
