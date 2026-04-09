ALTER TABLE trust_receipts
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id),
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'rent_receipt',
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE trust_payments
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id),
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'disbursement',
  ADD COLUMN IF NOT EXISTS description text;