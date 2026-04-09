ALTER TABLE public.rental_applications
  ADD COLUMN bond_amount numeric,
  ADD COLUMN bond_collected_at timestamptz,
  ADD COLUMN bond_lodgement_ref text,
  ADD COLUMN bond_lodged_at timestamptz;