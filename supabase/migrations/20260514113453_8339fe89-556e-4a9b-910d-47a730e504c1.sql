
-- 1. Extend support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS context JSONB,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Backfill from legacy columns
UPDATE public.support_tickets SET email = submitter_email WHERE email IS NULL AND submitter_email IS NOT NULL;
UPDATE public.support_tickets SET full_name = submitter_name WHERE full_name IS NULL AND submitter_name IS NOT NULL;
UPDATE public.support_tickets SET body = description WHERE body IS NULL AND description IS NOT NULL;

-- Make new columns NOT NULL where required
ALTER TABLE public.support_tickets ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.support_tickets ALTER COLUMN body SET NOT NULL;

-- Drop legacy NOT NULLs so new inserts using only the new columns succeed
ALTER TABLE public.support_tickets ALTER COLUMN submitter_name DROP NOT NULL;
ALTER TABLE public.support_tickets ALTER COLUMN submitter_email DROP NOT NULL;
ALTER TABLE public.support_tickets ALTER COLUMN description DROP NOT NULL;

-- Migrate legacy 'open' status to 'new'
UPDATE public.support_tickets SET status = 'new' WHERE status = 'open';

-- Replace check constraints to allow new vocabulary (union of old + new)
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('new','in_progress','waiting_on_user','resolved','closed'));

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN (
    'billing','technical','listing','agent_support','feature_request','complaint','other',
    'general','trust_accounting','listings'
  ));

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status, priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned
  ON public.support_tickets(assigned_to, status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.support_tickets_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_set_updated_at();

-- 2. support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','admin','system')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON public.support_messages(ticket_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 3. Policies (drop legacy support_tickets policies that reference removed schema, then recreate)
DROP POLICY IF EXISTS "Public can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users read own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins read all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins update tickets" ON public.support_tickets;

CREATE POLICY "Public can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users read own tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins read all tickets" ON public.support_tickets
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
  );

CREATE POLICY "Admins update tickets" ON public.support_tickets
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
  );

-- support_messages policies
DROP POLICY IF EXISTS "Users read own messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins read all messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins insert messages" ON public.support_messages;

CREATE POLICY "Users read own messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins read all messages" ON public.support_messages
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
  );

CREATE POLICY "Admins insert messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
  );

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
