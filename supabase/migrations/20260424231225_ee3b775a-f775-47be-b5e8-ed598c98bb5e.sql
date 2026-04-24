-- Add follow-up tracking columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action_note TEXT;

-- Indexes for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_contacts_last_contacted_at
  ON public.contacts (last_contacted_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_contacts_next_action_due_at
  ON public.contacts (next_action_due_at ASC NULLS LAST);

-- Agency-scoped composite for the default list view sort
CREATE INDEX IF NOT EXISTS idx_contacts_agency_next_action
  ON public.contacts (agency_id, next_action_due_at ASC NULLS LAST);

-- Trigger: when an active comms activity is logged, bump last_contacted_at
CREATE OR REPLACE FUNCTION public.bump_contact_last_contacted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only bump on active outbound/inbound comms — skip passive events
  IF NEW.activity_type IN (
    'email_sent', 'email_received',
    'sms_sent', 'sms_received',
    'whatsapp_sent', 'whatsapp_received',
    'call', 'call_logged',
    'meeting', 'meeting_logged',
    'note', 'follow_up',
    'reply_received'
  ) THEN
    UPDATE public.contacts
       SET last_contacted_at = COALESCE(NEW.created_at, now()),
           updated_at = now()
     WHERE id = NEW.contact_id
       AND (last_contacted_at IS NULL OR last_contacted_at < COALESCE(NEW.created_at, now()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_contact_last_contacted ON public.contact_activities;
CREATE TRIGGER trg_bump_contact_last_contacted
  AFTER INSERT ON public.contact_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_contact_last_contacted();