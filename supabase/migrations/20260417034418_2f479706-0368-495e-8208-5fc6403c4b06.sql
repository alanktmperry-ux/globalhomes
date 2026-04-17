-- Widen rule_type check to include vacancy_alert
ALTER TABLE public.pm_automation_rules DROP CONSTRAINT IF EXISTS pm_automation_rules_rule_type_check;
ALTER TABLE public.pm_automation_rules ADD CONSTRAINT pm_automation_rules_rule_type_check
  CHECK (rule_type IN ('arrears_sequence','lease_renewal_notice','inspection_entry_notice','maintenance_update','owner_statement_reminder','vacancy_alert'));

-- Vacancy tracking columns on tenancies
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS actual_vacate_date date;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS re_let_date date;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS days_to_re_let int;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS vacancy_loss_aud numeric;

-- Vacancy events audit table
CREATE TABLE IF NOT EXISTS public.vacancy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id),
  event_type text NOT NULL,
  event_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacancy_events_agent ON public.vacancy_events(agent_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_vacancy_events_property ON public.vacancy_events(property_id);

CREATE OR REPLACE FUNCTION public.validate_vacancy_event()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.event_type NOT IN ('notice_given','vacated','listed','re_let','extended') THEN
    RAISE EXCEPTION 'Invalid vacancy_event type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_vacancy_event ON public.vacancy_events;
CREATE TRIGGER trg_validate_vacancy_event BEFORE INSERT OR UPDATE ON public.vacancy_events
FOR EACH ROW EXECUTE FUNCTION public.validate_vacancy_event();

ALTER TABLE public.vacancy_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents view their vacancy events" ON public.vacancy_events;
CREATE POLICY "Agents view their vacancy events" ON public.vacancy_events
FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Agents insert their vacancy events" ON public.vacancy_events;
CREATE POLICY "Agents insert their vacancy events" ON public.vacancy_events
FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Partners view active-agency vacancy events" ON public.vacancy_events;
CREATE POLICY "Partners view active-agency vacancy events" ON public.vacancy_events
FOR SELECT USING (public.is_active_partner_for_agent(agent_id));

CREATE OR REPLACE FUNCTION public.track_tenancy_vacancy_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_weekly numeric;
  v_event text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  v_weekly := CASE COALESCE(NEW.rent_frequency,'weekly')
    WHEN 'weekly' THEN COALESCE(NEW.rent_amount,0)
    WHEN 'fortnightly' THEN COALESCE(NEW.rent_amount,0) / 2.0
    WHEN 'monthly' THEN COALESCE(NEW.rent_amount,0) * 12.0 / 52.0
    ELSE COALESCE(NEW.rent_amount,0)
  END;

  IF NEW.status = 'vacating' THEN
    v_event := 'notice_given';
  ELSIF NEW.status = 'ended' THEN
    IF NEW.actual_vacate_date IS NULL THEN
      NEW.actual_vacate_date := CURRENT_DATE;
    END IF;
    v_event := 'vacated';
  ELSIF NEW.status = 'active' AND TG_OP = 'UPDATE' AND OLD.status IN ('ended','pending') THEN
    IF NEW.re_let_date IS NULL THEN
      NEW.re_let_date := CURRENT_DATE;
    END IF;
    IF NEW.actual_vacate_date IS NOT NULL THEN
      NEW.days_to_re_let := GREATEST(0, (NEW.re_let_date - NEW.actual_vacate_date)::int);
      NEW.vacancy_loss_aud := ROUND((NEW.days_to_re_let * v_weekly / 7.0)::numeric, 2);
    END IF;
    v_event := 're_let';
  ELSE
    v_event := NULL;
  END IF;

  IF v_event IS NOT NULL THEN
    INSERT INTO public.vacancy_events (tenancy_id, property_id, agent_id, event_type, event_date, notes)
    VALUES (NEW.id, NEW.property_id, NEW.agent_id, v_event, CURRENT_DATE,
      'Auto-logged: ' || COALESCE(OLD.status,'(new)') || ' → ' || NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_tenancy_vacancy_lifecycle ON public.tenancies;
CREATE TRIGGER trg_track_tenancy_vacancy_lifecycle
BEFORE INSERT OR UPDATE OF status ON public.tenancies
FOR EACH ROW EXECUTE FUNCTION public.track_tenancy_vacancy_lifecycle();

-- Seed vacancy_alert automation rule for existing agents
INSERT INTO public.pm_automation_rules (agent_id, rule_type, trigger_day, trigger_event, channel, template_subject, template_body, is_active)
SELECT a.id, 'vacancy_alert', NULL, 'vacant', 'email',
  'Vacancy alert — {property_address}',
  E'Hi {agent_name},\n\n{property_address} has been vacant for {days_vacant} days. Estimated weekly loss: {weekly_loss}.\n\nReview your vacancy dashboard: /dashboard/vacancy-kpi',
  true
FROM public.agents a
WHERE NOT EXISTS (
  SELECT 1 FROM public.pm_automation_rules r
  WHERE r.agent_id = a.id AND r.rule_type = 'vacancy_alert'
);