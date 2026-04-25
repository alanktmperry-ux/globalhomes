-- ── Conversion fields on crm_leads ──
DO $$ BEGIN
  ALTER TABLE public.crm_leads
    ADD COLUMN first_contacted_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    ADD COLUMN first_contacted_at TIMESTAMPTZ,
    ADD COLUMN conversion_status TEXT DEFAULT 'new'
      CHECK (conversion_status IN ('new','contacted','qualified','disqualified','converted_to_listing','converted_to_inspection','dead')),
    ADD COLUMN conversion_notes TEXT,
    ADD COLUMN last_status_change_at TIMESTAMPTZ DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_conversion_status ON public.crm_leads(conversion_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_first_contacted_at ON public.crm_leads(first_contacted_at DESC NULLS LAST);

-- ── Extend crm_activities for unified timeline ──
ALTER TABLE public.crm_activities ALTER COLUMN agent_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.crm_activities
    ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN event_data JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Widen the type CHECK if one exists (drop + readd permissively)
DO $$ BEGIN
  ALTER TABLE public.crm_activities DROP CONSTRAINT IF EXISTS crm_activities_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.crm_activities
  ADD CONSTRAINT crm_activities_type_check CHECK (type IN (
    'note','call','email','meeting','task',
    'searched','page_view',
    'contacted_email','contacted_sms','contacted_call',
    'inspection_booked','offer_made','converted','status_changed'
  ));

-- ── Indexes for timeline + funnel ──
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_timeline ON public.crm_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type_created ON public.crm_activities(type, created_at DESC);

-- ── Trigger: voice_searches → crm_activities('searched') ──
CREATE OR REPLACE FUNCTION public.fn_voice_search_to_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_lead_id UUID;
BEGIN
  -- Find the crm_lead this voice search belongs to (by user_id → contact → lead, or session)
  SELECT cl.id INTO matched_lead_id
  FROM public.crm_leads cl
  LEFT JOIN public.contacts c ON c.id = cl.contact_id
  WHERE (NEW.user_id IS NOT NULL AND c.user_id = NEW.user_id)
  ORDER BY cl.created_at DESC
  LIMIT 1;

  IF matched_lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activities (lead_id, agent_id, type, body, auto_generated, event_data, created_at)
    VALUES (
      matched_lead_id,
      NULL,
      'searched',
      COALESCE(NEW.transcript, '(voice search)'),
      true,
      jsonb_build_object(
        'voice_search_id', NEW.id,
        'detected_language', NEW.detected_language,
        'parsed_query', NEW.parsed_query
      ),
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_voice_search_to_activity ON public.voice_searches;
CREATE TRIGGER trg_voice_search_to_activity
  AFTER INSERT ON public.voice_searches
  FOR EACH ROW EXECUTE FUNCTION public.fn_voice_search_to_activity();

-- ── Trigger: crm_leads.conversion_status change → 'status_changed' activity ──
CREATE OR REPLACE FUNCTION public.fn_crm_lead_status_change_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conversion_status IS DISTINCT FROM OLD.conversion_status THEN
    NEW.last_status_change_at := now();
    INSERT INTO public.crm_activities (lead_id, agent_id, type, body, auto_generated, event_data, created_at)
    VALUES (
      NEW.id,
      NEW.agent_id,
      'status_changed',
      format('Status changed: %s → %s', COALESCE(OLD.conversion_status,'(none)'), NEW.conversion_status),
      true,
      jsonb_build_object('from', OLD.conversion_status, 'to', NEW.conversion_status),
      now()
    );
  END IF;

  -- Auto-stamp first_contacted_at when status transitions out of 'new'
  IF (OLD.conversion_status = 'new' OR OLD.conversion_status IS NULL)
     AND NEW.conversion_status NOT IN ('new')
     AND NEW.first_contacted_at IS NULL THEN
    NEW.first_contacted_at := now();
    NEW.first_contacted_by_agent_id := COALESCE(NEW.first_contacted_by_agent_id, NEW.agent_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_lead_status_change ON public.crm_leads;
CREATE TRIGGER trg_crm_lead_status_change
  BEFORE UPDATE OF conversion_status ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_crm_lead_status_change_activity();