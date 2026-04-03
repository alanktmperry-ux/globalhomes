
-- Add new columns to conversations table
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS last_message_text TEXT;

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- Add edited_at to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_id ON public.conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_id ON public.conversation_participants (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at DESC);

-- RLS for conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_see_own_and_coparticipants"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_can_insert_participants"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "participants_update_own_row"
  ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Add conversation insert policy (conversations already has RLS enabled)
DO $$ BEGIN
  CREATE POLICY "authenticated_can_create_conversation"
    ON public.conversations FOR INSERT TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger: update conversation metadata + increment unread on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_text = LEFT(NEW.content, 120)
  WHERE id = NEW.conversation_id;

  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Enable realtime for conversation_participants
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migrate existing conversations to have participant entries
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, participant_1 FROM public.conversations WHERE participant_1 IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, participant_2 FROM public.conversations WHERE participant_2 IS NOT NULL
ON CONFLICT DO NOTHING;
