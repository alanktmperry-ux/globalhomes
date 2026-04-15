ALTER TABLE public.conversation_participants 
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conv_participants_archived 
ON public.conversation_participants (user_id, archived);