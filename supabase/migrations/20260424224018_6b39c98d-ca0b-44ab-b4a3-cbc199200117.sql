-- =========================================================
-- Contact Tags: agency-scoped tag catalog + assignments
-- =========================================================

-- 1. Tag catalog (agency-scoped)
CREATE TABLE public.contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 50),
  color TEXT NOT NULL DEFAULT '#3b82f6' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness per agency
CREATE UNIQUE INDEX contact_tags_agency_label_unique
  ON public.contact_tags (agency_id, lower(label));
CREATE INDEX contact_tags_agency_id_idx ON public.contact_tags (agency_id);

-- 2. Join table: contact <-> tag
CREATE TABLE public.contact_tag_assignments (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX contact_tag_assignments_contact_idx ON public.contact_tag_assignments (contact_id);
CREATE INDEX contact_tag_assignments_tag_idx ON public.contact_tag_assignments (tag_id);

-- 3. updated_at trigger for catalog
CREATE TRIGGER trg_contact_tags_updated_at
  BEFORE UPDATE ON public.contact_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Cap: 10 tags per contact
CREATE OR REPLACE FUNCTION public.enforce_contact_tag_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_count INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.contact_tag_assignments
  WHERE contact_id = NEW.contact_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'A contact can have at most 10 tags';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_contact_tag_cap
  BEFORE INSERT ON public.contact_tag_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_tag_cap();

-- 5. Helper: does the current user belong to a given agency?
--    (Reuses existing pattern; create a SECURITY DEFINER function to avoid RLS recursion.)
CREATE OR REPLACE FUNCTION public.current_user_in_agency(_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members am
    WHERE am.agency_id = _agency_id
      AND am.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.agencies a
    WHERE a.id = _agency_id
      AND a.owner_user_id = auth.uid()
  );
$$;

-- 6. RLS: contact_tags
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view tags"
  ON public.contact_tags FOR SELECT
  USING (public.current_user_in_agency(agency_id));

CREATE POLICY "Agency members can create tags"
  ON public.contact_tags FOR INSERT
  WITH CHECK (
    public.current_user_in_agency(agency_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Agency members can update tags"
  ON public.contact_tags FOR UPDATE
  USING (public.current_user_in_agency(agency_id));

CREATE POLICY "Agency members can delete tags"
  ON public.contact_tags FOR DELETE
  USING (public.current_user_in_agency(agency_id));

-- 7. RLS: contact_tag_assignments
ALTER TABLE public.contact_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view assignments"
  ON public.contact_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_tags t
      WHERE t.id = contact_tag_assignments.tag_id
        AND public.current_user_in_agency(t.agency_id)
    )
  );

CREATE POLICY "Agency members can assign tags"
  ON public.contact_tag_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contact_tags t
      WHERE t.id = contact_tag_assignments.tag_id
        AND public.current_user_in_agency(t.agency_id)
    )
    AND assigned_by = auth.uid()
  );

CREATE POLICY "Agency members can remove assignments"
  ON public.contact_tag_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_tags t
      WHERE t.id = contact_tag_assignments.tag_id
        AND public.current_user_in_agency(t.agency_id)
    )
  );