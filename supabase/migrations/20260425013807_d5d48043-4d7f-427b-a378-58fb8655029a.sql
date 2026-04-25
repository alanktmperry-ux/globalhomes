
-- Enums
DO $$ BEGIN
  CREATE TYPE public.inbox_channel AS ENUM ('email', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbox_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbox_sender_type AS ENUM ('agent', 'contact', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbox_thread_status AS ENUM ('open', 'snoozed', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Threads
CREATE TABLE IF NOT EXISTS public.inbox_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  is_unread BOOLEAN NOT NULL DEFAULT false,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status public.inbox_thread_status NOT NULL DEFAULT 'open',
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inbox_threads_has_subject_target CHECK (contact_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_inbox_threads_agency_last_msg ON public.inbox_threads (agency_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_contact ON public.inbox_threads (contact_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_lead ON public.inbox_threads (lead_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_assigned ON public.inbox_threads (assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_status ON public.inbox_threads (agency_id, status);

-- Messages
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  channel public.inbox_channel NOT NULL,
  direction public.inbox_direction NOT NULL,
  sender_type public.inbox_sender_type NOT NULL,
  sender_id UUID,
  body TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread_sent ON public.inbox_messages (thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_external ON public.inbox_messages (external_id) WHERE external_id IS NOT NULL;

-- Trigger: keep thread metadata fresh
CREATE OR REPLACE FUNCTION public.inbox_messages_update_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inbox_threads t
  SET
    last_message_at = NEW.sent_at,
    last_message_preview = LEFT(regexp_replace(coalesce(NEW.body, ''), '\s+', ' ', 'g'), 140),
    is_unread = CASE WHEN NEW.direction = 'inbound' THEN true ELSE t.is_unread END,
    status = CASE WHEN t.status = 'snoozed' AND NEW.direction = 'inbound' THEN 'open'::inbox_thread_status ELSE t.status END,
    updated_at = now()
  WHERE t.id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_messages_update_thread ON public.inbox_messages;
CREATE TRIGGER trg_inbox_messages_update_thread
AFTER INSERT ON public.inbox_messages
FOR EACH ROW EXECUTE FUNCTION public.inbox_messages_update_thread();

-- updated_at trigger on threads
CREATE OR REPLACE FUNCTION public.touch_updated_at_inbox()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_threads_touch ON public.inbox_threads;
CREATE TRIGGER trg_inbox_threads_touch
BEFORE UPDATE ON public.inbox_threads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_inbox();

-- RLS
ALTER TABLE public.inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a member of this agency?
CREATE OR REPLACE FUNCTION public.is_agency_member(_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = _agency_id AND am.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = _agency_id AND a.owner_user_id = auth.uid()
  );
$$;

-- Threads policies
DROP POLICY IF EXISTS "Agency members read inbox threads" ON public.inbox_threads;
CREATE POLICY "Agency members read inbox threads"
ON public.inbox_threads FOR SELECT TO authenticated
USING (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Agency members insert inbox threads" ON public.inbox_threads;
CREATE POLICY "Agency members insert inbox threads"
ON public.inbox_threads FOR INSERT TO authenticated
WITH CHECK (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Agency members update inbox threads" ON public.inbox_threads;
CREATE POLICY "Agency members update inbox threads"
ON public.inbox_threads FOR UPDATE TO authenticated
USING (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Agency members delete inbox threads" ON public.inbox_threads;
CREATE POLICY "Agency members delete inbox threads"
ON public.inbox_threads FOR DELETE TO authenticated
USING (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'));

-- Messages policies (gated through parent thread agency)
DROP POLICY IF EXISTS "Agency members read inbox messages" ON public.inbox_messages;
CREATE POLICY "Agency members read inbox messages"
ON public.inbox_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.inbox_threads t
  WHERE t.id = thread_id AND (public.is_agency_member(t.agency_id) OR public.has_role(auth.uid(), 'admin'))
));

DROP POLICY IF EXISTS "Agency members insert inbox messages" ON public.inbox_messages;
CREATE POLICY "Agency members insert inbox messages"
ON public.inbox_messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.inbox_threads t
  WHERE t.id = thread_id AND (public.is_agency_member(t.agency_id) OR public.has_role(auth.uid(), 'admin'))
));

DROP POLICY IF EXISTS "Agency members update inbox messages" ON public.inbox_messages;
CREATE POLICY "Agency members update inbox messages"
ON public.inbox_messages FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.inbox_threads t
  WHERE t.id = thread_id AND (public.is_agency_member(t.agency_id) OR public.has_role(auth.uid(), 'admin'))
));
