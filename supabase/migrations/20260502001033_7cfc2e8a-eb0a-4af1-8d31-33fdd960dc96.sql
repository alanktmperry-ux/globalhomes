CREATE TABLE public.listing_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_chat_sessions_listing_id ON public.listing_chat_sessions(listing_id);
CREATE INDEX idx_listing_chat_sessions_created_at ON public.listing_chat_sessions(created_at DESC);

ALTER TABLE public.listing_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a session (buyers are often anonymous)
CREATE POLICY "Anyone can create chat sessions"
ON public.listing_chat_sessions
FOR INSERT
WITH CHECK (true);

-- Anyone can update sessions (to append messages). The session id is a UUID acting as a capability token.
CREATE POLICY "Anyone can update chat sessions"
ON public.listing_chat_sessions
FOR UPDATE
USING (true);

-- The owning agent of the listing can read all sessions for their listings
CREATE POLICY "Agents can view chat sessions for their listings"
ON public.listing_chat_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = listing_chat_sessions.listing_id
      AND p.agent_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all chat sessions"
ON public.listing_chat_sessions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_listing_chat_sessions_updated_at
BEFORE UPDATE ON public.listing_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();