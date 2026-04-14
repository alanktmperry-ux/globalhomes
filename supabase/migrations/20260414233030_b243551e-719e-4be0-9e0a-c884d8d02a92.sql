ALTER TABLE public.rental_applications
  ADD COLUMN IF NOT EXISTS id_document_number text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;