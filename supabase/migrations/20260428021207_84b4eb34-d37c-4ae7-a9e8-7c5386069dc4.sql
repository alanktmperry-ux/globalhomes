ALTER TABLE public.property_inspections
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolution_notes text;