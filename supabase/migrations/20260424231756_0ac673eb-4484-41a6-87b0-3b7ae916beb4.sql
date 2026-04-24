-- Saved views for the Contacts list
CREATE TABLE IF NOT EXISTS public.contact_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_saved_views_owner_name_unique UNIQUE (owner_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contact_saved_views_owner ON public.contact_saved_views (owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_saved_views_agency_shared
  ON public.contact_saved_views (agency_id) WHERE is_shared = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_contact_saved_view_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_contact_saved_view ON public.contact_saved_views;
CREATE TRIGGER trg_touch_contact_saved_view
  BEFORE UPDATE ON public.contact_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.touch_contact_saved_view_updated_at();

-- Helper: is the current user a principal or admin in the given agency?
-- (Avoids cross-table refs in RLS by encapsulating in a SECURITY DEFINER fn.)
CREATE OR REPLACE FUNCTION public.is_agency_admin_or_principal(_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.agency_members am
     WHERE am.agency_id = _agency_id
       AND am.user_id = auth.uid()
       AND am.role IN ('principal', 'admin')
  );
$$;

-- RLS
ALTER TABLE public.contact_saved_views ENABLE ROW LEVEL SECURITY;

-- View own + shared views in same agency
CREATE POLICY "View own or agency-shared saved views"
  ON public.contact_saved_views
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (is_shared = true AND public.is_agency_admin_or_principal(agency_id) IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.agency_members am
           WHERE am.agency_id = contact_saved_views.agency_id
             AND am.user_id = auth.uid()
        ))
  );

-- Insert: only as yourself, only into an agency you belong to
CREATE POLICY "Create own saved views in your agency"
  ON public.contact_saved_views
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.agency_members am
       WHERE am.agency_id = contact_saved_views.agency_id
         AND am.user_id = auth.uid()
    )
  );

-- Update: owner always; admins/principals only when view is shared
CREATE POLICY "Update own or shared agency saved views"
  ON public.contact_saved_views
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (is_shared = true AND public.is_agency_admin_or_principal(agency_id))
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR (is_shared = true AND public.is_agency_admin_or_principal(agency_id))
  );

-- Delete: owner always; admins/principals only when view is shared
CREATE POLICY "Delete own or shared agency saved views"
  ON public.contact_saved_views
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (is_shared = true AND public.is_agency_admin_or_principal(agency_id))
  );