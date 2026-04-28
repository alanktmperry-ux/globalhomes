ALTER TABLE public.property_inspections
  ADD COLUMN IF NOT EXISTS tenant_dispute_deadline date;