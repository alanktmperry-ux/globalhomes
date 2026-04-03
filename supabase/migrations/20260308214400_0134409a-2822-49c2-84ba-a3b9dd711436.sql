
-- Voice searches table for analytics
CREATE TABLE public.voice_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript text NOT NULL,
  detected_language text DEFAULT 'en',
  parsed_query jsonb DEFAULT '{}'::jsonb,
  user_location jsonb DEFAULT NULL,
  session_id text,
  audio_duration numeric DEFAULT 0,
  status text DEFAULT 'active',
  user_id uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_searches ENABLE ROW LEVEL SECURITY;

-- Anyone can insert voice searches (public search feature)
CREATE POLICY "Anyone can insert voice searches" ON public.voice_searches
  FOR INSERT WITH CHECK (true);

-- Users can view own searches if authenticated
CREATE POLICY "Users can view own voice searches" ON public.voice_searches
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Leads table for agent contact capture
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  user_phone text,
  user_name text NOT NULL,
  message text,
  search_context jsonb DEFAULT NULL,
  preferred_contact text DEFAULT 'email',
  urgency text DEFAULT 'just_browsing',
  pre_approval_status text DEFAULT 'not_started',
  status text DEFAULT 'new',
  score integer DEFAULT 50,
  user_id uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public contact form)
CREATE POLICY "Anyone can submit leads" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Agents can view their own leads
CREATE POLICY "Agents can view own leads" ON public.leads
  FOR SELECT USING (
    auth.uid() IN (
      SELECT agents.user_id FROM agents WHERE agents.id = leads.agent_id
    )
  );

-- Agents can update lead status
CREATE POLICY "Agents can update own leads" ON public.leads
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT agents.user_id FROM agents WHERE agents.id = leads.agent_id
    )
  );
