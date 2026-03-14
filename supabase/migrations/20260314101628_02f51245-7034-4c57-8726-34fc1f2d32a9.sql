
-- Conversations table: tracks threads between two users, optionally linked to a property
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (participant_1, participant_2, property_id)
);

-- Messages table: individual messages within a conversation
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_conversations_participant_1 ON public.conversations(participant_1);
CREATE INDEX idx_conversations_participant_2 ON public.conversations(participant_2);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS for conversations: users can see conversations they're part of
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- RLS for messages: users can see messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.conversations
    WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
  ));

CREATE POLICY "Users can send messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
