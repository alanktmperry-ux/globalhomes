-- 1. pipeline_stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  probability NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique label per agency among non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pipeline_stages_agency_label_active
  ON public.pipeline_stages (agency_id, label)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_agency_order
  ON public.pipeline_stages (agency_id, display_order)
  WHERE deleted_at IS NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_pipeline_stages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.tg_pipeline_stages_updated_at();

-- Cap: max 10 active stages per agency
CREATE OR REPLACE FUNCTION public.tg_pipeline_stages_enforce_cap()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE active_count INT;
BEGIN
  IF NEW.deleted_at IS NULL THEN
    SELECT COUNT(*) INTO active_count
      FROM public.pipeline_stages
      WHERE agency_id = NEW.agency_id
        AND deleted_at IS NULL
        AND id <> NEW.id;
    IF active_count >= 10 THEN
      RAISE EXCEPTION 'Pipeline stage limit reached (max 10 per agency)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pipeline_stages_enforce_cap ON public.pipeline_stages;
CREATE TRIGGER pipeline_stages_enforce_cap
  BEFORE INSERT OR UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.tg_pipeline_stages_enforce_cap();

-- 2. RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Anyone in the agency can read
CREATE POLICY "Agency members can view pipeline stages"
  ON public.pipeline_stages FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM public.agents WHERE user_id = auth.uid())
  );

-- Only principals/admins can mutate
CREATE POLICY "Agency principals/admins can insert pipeline stages"
  ON public.pipeline_stages FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agents
      WHERE user_id = auth.uid() AND agency_role IN ('principal','admin')
    )
  );

CREATE POLICY "Agency principals/admins can update pipeline stages"
  ON public.pipeline_stages FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agents
      WHERE user_id = auth.uid() AND agency_role IN ('principal','admin')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agents
      WHERE user_id = auth.uid() AND agency_role IN ('principal','admin')
    )
  );

CREATE POLICY "Agency principals/admins can delete pipeline stages"
  ON public.pipeline_stages FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agents
      WHERE user_id = auth.uid() AND agency_role IN ('principal','admin')
    )
  );

-- 3. Seeder for new agencies
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages(p_agency_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.pipeline_stages (agency_id, label, color, probability, display_order)
  VALUES
    (p_agency_id, 'Prospecting', '#3b82f6', 10,  0),
    (p_agency_id, 'Appraisal',   '#a855f7', 25,  1),
    (p_agency_id, 'Listed',      '#f59e0b', 50,  2),
    (p_agency_id, 'Under Offer', '#10b981', 80,  3),
    (p_agency_id, 'Settled',     '#64748b', 100, 4)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Trigger to auto-seed when an agency is created
CREATE OR REPLACE FUNCTION public.tg_agencies_seed_pipeline_stages()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_pipeline_stages(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS agencies_seed_pipeline_stages ON public.agencies;
CREATE TRIGGER agencies_seed_pipeline_stages
  AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.tg_agencies_seed_pipeline_stages();

-- 4. Add stage_id to properties (nullable; solo agents stay NULL and use defaults in code)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_properties_stage_id ON public.properties(stage_id) WHERE stage_id IS NOT NULL;

-- 5. Backfill: seed defaults for every existing agency, then backfill listings
DO $$
DECLARE a RECORD;
BEGIN
  FOR a IN SELECT id FROM public.agencies LOOP
    PERFORM public.seed_default_pipeline_stages(a.id);
  END LOOP;
END$$;

-- Map existing properties.status -> default stage for the property's agency
WITH agent_agency AS (
  SELECT id AS agent_id, agency_id FROM public.agents WHERE agency_id IS NOT NULL
),
target AS (
  SELECT
    p.id AS property_id,
    aa.agency_id,
    CASE
      WHEN p.is_active = false AND p.status = 'pending'      THEN 'Prospecting'
      WHEN p.is_active = false AND p.status = 'coming-soon'  THEN 'Appraisal'
      WHEN p.status = 'public'                                THEN 'Listed'
      WHEN p.status = 'under_offer'                           THEN 'Under Offer'
      WHEN p.status = 'sold'                                  THEN 'Settled'
      ELSE 'Prospecting'
    END AS stage_label
  FROM public.properties p
  JOIN agent_agency aa ON aa.agent_id = p.agent_id
)
UPDATE public.properties p
SET stage_id = ps.id
FROM target t
JOIN public.pipeline_stages ps
  ON ps.agency_id = t.agency_id
 AND ps.label = t.stage_label
 AND ps.deleted_at IS NULL
WHERE p.id = t.property_id
  AND p.stage_id IS NULL;