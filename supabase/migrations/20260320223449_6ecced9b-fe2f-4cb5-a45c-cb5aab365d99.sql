CREATE TABLE public.vendor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  views_at_send INTEGER NOT NULL DEFAULT 0,
  enquiries_at_send INTEGER NOT NULL DEFAULT 0,
  hot_leads_at_send INTEGER NOT NULL DEFAULT 0,
  days_on_market_at_send INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.vendor_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can manage own vendor reports"
  ON public.vendor_reports
  FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS vendor_email TEXT;