
-- Add archived_at to conversations for archive functionality
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS archived_by uuid[] DEFAULT '{}';

-- Allow participants to delete their own conversations
CREATE POLICY "Participants can delete own conversations"
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Allow participants to update own conversations (for archiving)
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Participants can update own conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());
