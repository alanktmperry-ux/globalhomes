-- Drop the legacy bare table (unused)
DROP TABLE IF EXISTS public.message_templates CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.message_template_channel AS ENUM ('email','sms','whatsapp','in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_template_category AS ENUM (
    'lead_followup','open_home','under_offer','settled','appraisal','nurture','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel public.message_template_channel NOT NULL,
  category public.message_template_category NOT NULL DEFAULT 'custom',
  body_by_language JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject_by_language JSONB,
  merge_tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX message_templates_agency_name_unique
  ON public.message_templates (agency_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX message_templates_agency_idx ON public.message_templates (agency_id) WHERE deleted_at IS NULL;
CREATE INDEX message_templates_channel_idx ON public.message_templates (channel) WHERE deleted_at IS NULL;
CREATE INDEX message_templates_category_idx ON public.message_templates (category) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.message_templates_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.body_by_language IS NULL OR NEW.body_by_language = '{}'::jsonb THEN
    RAISE EXCEPTION 'body_by_language must include at least an English (en) entry';
  END IF;
  IF NOT (NEW.body_by_language ? 'en') OR coalesce(btrim(NEW.body_by_language->>'en'),'') = '' THEN
    RAISE EXCEPTION 'English (en) body is required';
  END IF;
  IF NEW.channel = 'email' THEN
    IF NEW.subject_by_language IS NULL OR NOT (NEW.subject_by_language ? 'en') OR coalesce(btrim(NEW.subject_by_language->>'en'),'') = '' THEN
      RAISE EXCEPTION 'Email templates require an English (en) subject';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER message_templates_validate_trg
BEFORE INSERT OR UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.message_templates_validate();

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view templates"
  ON public.message_templates
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_agency_member(auth.uid(), agency_id)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Principals can insert templates"
  ON public.message_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_agency_principal(auth.uid(), agency_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Principals can update templates"
  ON public.message_templates
  FOR UPDATE TO authenticated
  USING (
    public.is_agency_principal(auth.uid(), agency_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.is_agency_principal(auth.uid(), agency_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Principals can delete templates"
  ON public.message_templates
  FOR DELETE TO authenticated
  USING (
    public.is_agency_principal(auth.uid(), agency_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );