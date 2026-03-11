-- Run this in your Supabase SQL editor to create the payments table

CREATE TABLE payments (
  id                  BIGSERIAL PRIMARY KEY,
  phone               TEXT NOT NULL,
  amount              NUMERIC(10, 2) NOT NULL,
  amount_paid         NUMERIC(10, 2),
  reference           TEXT,
  checkout_request_id TEXT UNIQUE NOT NULL,
  merchant_request_id TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | failed
  receipt_number      TEXT,
  result_code         INT,
  result_desc         TEXT,
  transaction_date    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by checkout_request_id (used by /api/status and /api/callback)
CREATE INDEX idx_payments_checkout_request_id ON payments (checkout_request_id);

-- Optional: auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
