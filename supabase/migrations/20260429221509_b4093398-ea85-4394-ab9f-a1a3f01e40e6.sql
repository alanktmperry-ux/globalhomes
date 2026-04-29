-- Add columns to halo_responses for inbox functionality
ALTER TABLE public.halo_responses
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS suggested_property_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS accepted boolean,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by_seeker boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

-- Halo messages: lightweight thread per halo_response (seeker <-> agent)
CREATE TABLE IF NOT EXISTS public.halo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  halo_response_id uuid NOT NULL REFERENCES public.halo_responses(id) ON DELETE CASCADE,
  halo_id uuid NOT NULL REFERENCES public.halos(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('seeker','agent')),
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_by_recipient boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_halo_messages_response ON public.halo_messages(halo_response_id, created_at);
CREATE INDEX IF NOT EXISTS idx_halo_messages_halo ON public.halo_messages(halo_id);

ALTER TABLE public.halo_messages ENABLE ROW LEVEL SECURITY;

-- Seeker can read messages on their own halos
CREATE POLICY "Seekers can view messages on their halos"
ON public.halo_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.halos h
    WHERE h.id = halo_messages.halo_id AND h.seeker_id = auth.uid()
  )
);

-- Agents can read messages on responses they sent
CREATE POLICY "Agents can view messages on their responses"
ON public.halo_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.halo_responses r
    WHERE r.id = halo_messages.halo_response_id AND r.agent_id = auth.uid()
  )
);

-- Seekers can insert messages as themselves on their own halos
CREATE POLICY "Seekers can send messages on their halos"
ON public.halo_messages FOR INSERT
WITH CHECK (
  sender_type = 'seeker'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.halos h
    WHERE h.id = halo_messages.halo_id AND h.seeker_id = auth.uid()
  )
);

-- Agents can insert messages as themselves on responses they own
CREATE POLICY "Agents can send messages on their responses"
ON public.halo_messages FOR INSERT
WITH CHECK (
  sender_type = 'agent'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.halo_responses r
    WHERE r.id = halo_messages.halo_response_id AND r.agent_id = auth.uid()
  )
);

-- Recipients can mark messages as read
CREATE POLICY "Seekers can mark agent messages read"
ON public.halo_messages FOR UPDATE
USING (
  sender_type = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.halos h
    WHERE h.id = halo_messages.halo_id AND h.seeker_id = auth.uid()
  )
);

CREATE POLICY "Agents can mark seeker messages read"
ON public.halo_messages FOR UPDATE
USING (
  sender_type = 'seeker'
  AND EXISTS (
    SELECT 1 FROM public.halo_responses r
    WHERE r.id = halo_messages.halo_response_id AND r.agent_id = auth.uid()
  )
);

-- Allow seekers to update accepted/dismissed flags on their responses
CREATE POLICY "Seekers can update response status on their halos"
ON public.halo_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.halos h
    WHERE h.id = halo_responses.halo_id AND h.seeker_id = auth.uid()
  )
);
