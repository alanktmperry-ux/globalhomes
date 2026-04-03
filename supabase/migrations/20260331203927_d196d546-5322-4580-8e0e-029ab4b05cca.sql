
-- Open home sessions
CREATE TABLE IF NOT EXISTS public.open_homes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  agent_id        uuid REFERENCES public.agents(id) NOT NULL,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  max_attendees   integer DEFAULT 30,
  notes           text,
  status          text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  qr_token        text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_open_homes_property ON public.open_homes(property_id, starts_at);
CREATE INDEX idx_open_homes_agent ON public.open_homes(agent_id, starts_at);

-- Open home registrations
CREATE TABLE IF NOT EXISTS public.open_home_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  open_home_id    uuid REFERENCES public.open_homes(id) ON DELETE CASCADE NOT NULL,
  user_id         uuid REFERENCES auth.users(id),
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  on_waitlist     boolean DEFAULT false,
  attended        boolean DEFAULT false,
  attended_at     timestamptz,
  reminder_24h_sent boolean DEFAULT false,
  reminder_1h_sent  boolean DEFAULT false,
  registered_at   timestamptz DEFAULT now(),
  UNIQUE(open_home_id, email)
);

CREATE INDEX idx_oh_regs_open_home ON public.open_home_registrations(open_home_id);

-- RLS
ALTER TABLE public.open_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_home_registrations ENABLE ROW LEVEL SECURITY;

-- Open homes: public can read scheduled/in_progress
CREATE POLICY "oh_public_read" ON public.open_homes
  FOR SELECT USING (status IN ('scheduled','in_progress'));

-- Agents can read all their own (including completed)
CREATE POLICY "oh_agent_read_all" ON public.open_homes
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Agents can insert for their own agent record
CREATE POLICY "oh_agent_insert" ON public.open_homes
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Agents can update their own
CREATE POLICY "oh_agent_update" ON public.open_homes
  FOR UPDATE USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Registrations: anyone (including anon) can insert
CREATE POLICY "oh_reg_insert" ON public.open_home_registrations
  FOR INSERT WITH CHECK (true);

-- Registrations: user can read own; agent can read all for their sessions
CREATE POLICY "oh_reg_read" ON public.open_home_registrations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.open_homes oh
      WHERE oh.id = open_home_id
        AND oh.agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid())
    )
  );

-- Agent can update attendance on their sessions
CREATE POLICY "oh_reg_agent_update" ON public.open_home_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.open_homes oh
      WHERE oh.id = open_home_id
        AND oh.agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid())
    )
  );

-- Enable realtime for registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.open_home_registrations;
