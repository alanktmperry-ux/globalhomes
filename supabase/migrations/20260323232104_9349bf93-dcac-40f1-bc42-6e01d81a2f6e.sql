CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'trust_accounting', 'listings', 'other')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'listings', 'trust_accounting', 'search', 'analytics', 'mobile', 'integrations')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  upvote_count integer NOT NULL DEFAULT 0,
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_request_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid REFERENCES public.feature_requests(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_request_id, agent_id)
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own tickets" ON public.support_tickets FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can submit ticket" ON public.support_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins see all tickets" ON public.support_tickets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Feature requests readable" ON public.feature_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Agents submit feature requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage feature requests" ON public.feature_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents upvote features" ON public.feature_request_upvotes FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));