
-- ============================================
-- PM AUTOMATION RULES
-- ============================================
CREATE TABLE IF NOT EXISTS public.pm_automation_rules (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  rule_type text not null check (rule_type in ('arrears_sequence','lease_renewal_notice','inspection_entry_notice','maintenance_update')),
  trigger_day int,
  trigger_event text, -- for maintenance: acknowledged / in_progress / completed
  channel text not null default 'email',
  template_subject text,
  template_body text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_pm_automation_rules_agent ON public.pm_automation_rules(agent_id, rule_type, is_active);

ALTER TABLE public.pm_automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents view own rules" ON public.pm_automation_rules;
CREATE POLICY "Agents view own rules" ON public.pm_automation_rules
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Agents insert own rules" ON public.pm_automation_rules;
CREATE POLICY "Agents insert own rules" ON public.pm_automation_rules
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Agents update own rules" ON public.pm_automation_rules;
CREATE POLICY "Agents update own rules" ON public.pm_automation_rules
  FOR UPDATE USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Agents delete own rules" ON public.pm_automation_rules;
CREATE POLICY "Agents delete own rules" ON public.pm_automation_rules
  FOR DELETE USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================
-- PM AUTOMATION LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.pm_automation_log (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.pm_automation_rules(id) on delete set null,
  agent_id uuid references public.agents(id) on delete cascade,
  tenancy_id uuid,
  recipient_email text,
  recipient_type text,
  subject text,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent','failed','skipped')),
  error_text text,
  meta jsonb default '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pm_automation_log_agent ON public.pm_automation_log(agent_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_automation_log_rule_tenancy ON public.pm_automation_log(rule_id, tenancy_id, sent_at DESC);

ALTER TABLE public.pm_automation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents view own log" ON public.pm_automation_log;
CREATE POLICY "Agents view own log" ON public.pm_automation_log
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Inserts to the log come from the edge function with the service role and bypass RLS.

-- ============================================
-- SEED DEFAULTS — function + trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_pm_automation_defaults(_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if this agent already has any rules
  IF EXISTS (SELECT 1 FROM public.pm_automation_rules WHERE agent_id = _agent_id) THEN
    RETURN;
  END IF;

  -- Arrears sequence
  INSERT INTO public.pm_automation_rules (agent_id, rule_type, trigger_day, channel, template_subject, template_body, is_active) VALUES
  (_agent_id, 'arrears_sequence', 1, 'email', 'Rent overdue reminder',
   E'Hi {tenant_name},\n\nThis is a friendly reminder that your rent for {property_address} is now 1 day overdue. The amount outstanding is {amount_overdue}.\n\nIf you have already paid, please disregard this message. Otherwise, please make payment as soon as possible.\n\nKind regards,\n{agent_name}\n{agent_phone}', true),
  (_agent_id, 'arrears_sequence', 3, 'email', 'Rent now 3 days overdue',
   E'Hi {tenant_name},\n\nYour rent payment for {property_address} is now {days_overdue} days overdue. The outstanding amount is {amount_overdue}.\n\nPlease arrange payment immediately or contact us to discuss your situation.\n\nRegards,\n{agent_name}\n{agent_phone}', true),
  (_agent_id, 'arrears_sequence', 7, 'email', 'Urgent: Rent 7 days overdue — please contact us immediately',
   E'Hi {tenant_name},\n\nYour rent for {property_address} is now {days_overdue} days overdue. Outstanding: {amount_overdue}.\n\nThis is an urgent matter. Please contact us today on {agent_phone} to resolve this.\n\nRegards,\n{agent_name}', true),
  (_agent_id, 'arrears_sequence', 14, 'email', 'Final notice: Rent 14 days overdue',
   E'Dear {tenant_name},\n\nThis is a formal notice that rent for {property_address} is {days_overdue} days overdue. Outstanding amount: {amount_overdue}.\n\nIf payment is not received within 48 hours we may be required to issue a formal breach notice in line with the Residential Tenancies Act.\n\nPlease contact us immediately on {agent_phone}.\n\n{agent_name}', true);

  -- Lease renewal notices
  INSERT INTO public.pm_automation_rules (agent_id, rule_type, trigger_day, channel, template_subject, template_body, is_active) VALUES
  (_agent_id, 'lease_renewal_notice', 90, 'email', 'Your lease is coming up for renewal — let''s talk',
   E'Hi {tenant_name},\n\nYour lease at {property_address} is due to end on {lease_end_date}. We''d love to hear if you''d like to stay on.\n\nReply to this email or call {agent_phone} to discuss renewal options.\n\nKind regards,\n{agent_name}', true),
  (_agent_id, 'lease_renewal_notice', 60, 'email', 'Lease renewal — action required within 30 days',
   E'Hi {tenant_name},\n\nYour lease at {property_address} ends on {lease_end_date}. To renew, please confirm within the next 30 days.\n\nLet us know your intentions so we can prepare the paperwork.\n\nRegards,\n{agent_name}\n{agent_phone}', true),
  (_agent_id, 'lease_renewal_notice', 30, 'email', 'Final notice: Lease ends in 30 days',
   E'Hi {tenant_name},\n\nYour lease at {property_address} ends on {lease_end_date} — 30 days from now.\n\nPlease let us know whether you intend to renew or vacate so we can plan next steps.\n\n{agent_name}\n{agent_phone}', true);

  -- Inspection entry notices
  INSERT INTO public.pm_automation_rules (agent_id, rule_type, trigger_day, channel, template_subject, template_body, is_active) VALUES
  (_agent_id, 'inspection_entry_notice', 7, 'email', 'Inspection notice — entry scheduled for {inspection_date}',
   E'Hi {tenant_name},\n\nThis is formal notice of a routine inspection at {property_address}, scheduled for {inspection_date} at {inspection_time}.\n\nIf this time doesn''t work, please reply within 48 hours and we''ll arrange an alternative.\n\nRegards,\n{agent_name}', true),
  (_agent_id, 'inspection_entry_notice', 1, 'email', 'Reminder: Property inspection tomorrow at {inspection_time}',
   E'Hi {tenant_name},\n\nA quick reminder that your inspection at {property_address} is tomorrow at {inspection_time}.\n\nNo need to be home — we''ll let ourselves in with the office key unless you''ve told us otherwise.\n\nRegards,\n{agent_name}', true);

  -- Maintenance status updates (trigger_event drives these, trigger_day is null)
  INSERT INTO public.pm_automation_rules (agent_id, rule_type, trigger_day, trigger_event, channel, template_subject, template_body, is_active) VALUES
  (_agent_id, 'maintenance_update', NULL, 'acknowledged', 'email', 'We''ve received your maintenance request',
   E'Hi {tenant_name},\n\nWe''ve received your maintenance request for {property_address}: "{job_title}".\n\nWe''ll review it and arrange a tradesperson as soon as possible. We''ll keep you posted.\n\n{agent_name}\n{agent_phone}', true),
  (_agent_id, 'maintenance_update', NULL, 'in_progress', 'email', 'Work has begun on your maintenance request',
   E'Hi {tenant_name},\n\nGood news — work has commenced on your maintenance request "{job_title}" at {property_address}.\n\nWe''ll let you know as soon as it''s complete.\n\n{agent_name}', true),
  (_agent_id, 'maintenance_update', NULL, 'completed', 'email', 'Your maintenance request is complete',
   E'Hi {tenant_name},\n\nYour maintenance request "{job_title}" at {property_address} has been marked complete.\n\nIf there''s anything still outstanding, please let us know on {agent_phone}.\n\n{agent_name}', true);
END;
$$;

-- Seed for all existing agents
DO $$
DECLARE a record;
BEGIN
  FOR a IN SELECT id FROM public.agents LOOP
    PERFORM public.seed_pm_automation_defaults(a.id);
  END LOOP;
END $$;

-- Trigger so new agents get defaults automatically
CREATE OR REPLACE FUNCTION public.handle_new_agent_automation_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_pm_automation_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_pm_automation_defaults ON public.agents;
CREATE TRIGGER trg_seed_pm_automation_defaults
AFTER INSERT ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_agent_automation_seed();
