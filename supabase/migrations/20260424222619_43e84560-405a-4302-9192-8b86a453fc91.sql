-- Custom fields enum
CREATE TYPE public.custom_field_type AS ENUM ('text', 'number', 'date', 'dropdown', 'multi_select', 'boolean');

-- Field definitions table
CREATE TABLE public.contact_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type public.custom_field_type NOT NULL,
  options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_custom_fields_agency_key_unique UNIQUE (agency_id, field_key),
  CONSTRAINT contact_custom_fields_field_key_format CHECK (field_key ~ '^[a-z][a-z0-9_]{0,49}$')
);

CREATE INDEX idx_contact_custom_fields_agency_order
  ON public.contact_custom_fields (agency_id, display_order)
  WHERE is_active;

-- Field values table
CREATE TABLE public.contact_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.contact_custom_fields(id) ON DELETE CASCADE,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_custom_values_contact_field_unique UNIQUE (contact_id, field_id)
);

CREATE INDEX idx_contact_custom_values_contact ON public.contact_custom_values (contact_id);
CREATE INDEX idx_contact_custom_values_field ON public.contact_custom_values (field_id);

-- updated_at triggers
CREATE TRIGGER trg_contact_custom_fields_updated_at
  BEFORE UPDATE ON public.contact_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contact_custom_values_updated_at
  BEFORE UPDATE ON public.contact_custom_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15-field cap enforcement (counts active fields only)
CREATE OR REPLACE FUNCTION public.enforce_contact_custom_fields_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO active_count
    FROM public.contact_custom_fields
    WHERE agency_id = NEW.agency_id
      AND is_active = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF active_count >= 15 THEN
      RAISE EXCEPTION 'Maximum of 15 active custom fields per agency reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contact_custom_fields_cap
  BEFORE INSERT OR UPDATE OF is_active, agency_id ON public.contact_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_custom_fields_cap();

-- Helper: derive agency for a custom value via its field
CREATE OR REPLACE FUNCTION public.contact_custom_value_agency(_field_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.contact_custom_fields WHERE id = _field_id;
$$;

-- Enable RLS
ALTER TABLE public.contact_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_custom_values ENABLE ROW LEVEL SECURITY;

-- RLS: contact_custom_fields
CREATE POLICY "Agency members can view custom fields"
  ON public.contact_custom_fields FOR SELECT TO authenticated
  USING (is_agency_member(auth.uid(), agency_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agency principals can insert custom fields"
  ON public.contact_custom_fields FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = contact_custom_fields.agency_id
        AND am.role IN ('owner', 'principal', 'admin')
    )
  );

CREATE POLICY "Agency principals can update custom fields"
  ON public.contact_custom_fields FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = contact_custom_fields.agency_id
        AND am.role IN ('owner', 'principal', 'admin')
    )
  );

CREATE POLICY "Agency principals can delete custom fields"
  ON public.contact_custom_fields FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = contact_custom_fields.agency_id
        AND am.role IN ('owner', 'principal', 'admin')
    )
  );

-- RLS: contact_custom_values (mirror contacts agency scope via field)
CREATE POLICY "Agency members can view custom values"
  ON public.contact_custom_values FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_agency_member(auth.uid(), public.contact_custom_value_agency(field_id))
  );

CREATE POLICY "Agency members can insert custom values"
  ON public.contact_custom_values FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_agency_member(auth.uid(), public.contact_custom_value_agency(field_id))
  );

CREATE POLICY "Agency members can update custom values"
  ON public.contact_custom_values FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_agency_member(auth.uid(), public.contact_custom_value_agency(field_id))
  );

CREATE POLICY "Agency members can delete custom values"
  ON public.contact_custom_values FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_agency_member(auth.uid(), public.contact_custom_value_agency(field_id))
  );