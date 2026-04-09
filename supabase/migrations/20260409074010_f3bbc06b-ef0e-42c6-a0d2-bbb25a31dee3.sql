ALTER TABLE rental_applications
  ADD COLUMN IF NOT EXISTS bond_amount numeric,
  ADD COLUMN IF NOT EXISTS bond_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS bond_lodgement_ref text,
  ADD COLUMN IF NOT EXISTS bond_lodged_at timestamptz;