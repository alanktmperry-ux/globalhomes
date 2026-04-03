-- buyer_pre_approvals table
CREATE TABLE IF NOT EXISTS public.buyer_pre_approvals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  document_url        text NOT NULL,
  document_type       text NOT NULL DEFAULT 'bank_letter',
  lender_name         text,
  approved_amount     numeric(12,0),
  expiry_date         date,
  issue_date          date,
  status              text NOT NULL DEFAULT 'pending',
  verified_by         uuid,
  verified_at         timestamptz,
  rejection_reason    text,
  reviewer_note       text,
  submitted_at        timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_pre_approvals_user   ON public.buyer_pre_approvals(user_id);
CREATE INDEX idx_pre_approvals_status ON public.buyer_pre_approvals(status);

-- Validation trigger instead of CHECK
CREATE OR REPLACE FUNCTION public.validate_pre_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.document_type NOT IN ('bank_letter','broker_letter','conditional_approval','formal_approval') THEN
    RAISE EXCEPTION 'Invalid document_type: %', NEW.document_type;
  END IF;
  IF NEW.status NOT IN ('pending','verified','rejected','expired') THEN
    RAISE EXCEPTION 'Invalid pre-approval status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pre_approval_trigger
  BEFORE INSERT OR UPDATE ON public.buyer_pre_approvals
  FOR EACH ROW EXECUTE FUNCTION public.validate_pre_approval();

-- Add badge columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pre_approval_verified  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_approval_amount    numeric(12,0),
  ADD COLUMN IF NOT EXISTS pre_approval_expiry    date,
  ADD COLUMN IF NOT EXISTS pre_approval_lender    text;

-- Sync badge trigger
CREATE OR REPLACE FUNCTION public.sync_pre_approval_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    UPDATE public.profiles SET
      pre_approval_verified = true,
      pre_approval_amount   = NEW.approved_amount,
      pre_approval_expiry   = NEW.expiry_date,
      pre_approval_lender   = NEW.lender_name
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('rejected', 'expired') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.buyer_pre_approvals
      WHERE user_id = NEW.user_id
        AND status = 'verified'
        AND id != NEW.id
        AND (expiry_date IS NULL OR expiry_date > now()::date)
    ) THEN
      UPDATE public.profiles SET
        pre_approval_verified = false,
        pre_approval_amount   = NULL,
        pre_approval_expiry   = NULL,
        pre_approval_lender   = NULL
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pre_approval_status_change
  AFTER UPDATE OF status ON public.buyer_pre_approvals
  FOR EACH ROW EXECUTE FUNCTION public.sync_pre_approval_badge();

-- Auto-expire function
CREATE OR REPLACE FUNCTION public.expire_stale_pre_approvals()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.buyer_pre_approvals
  SET status = 'expired', updated_at = now()
  WHERE status = 'verified'
    AND expiry_date IS NOT NULL
    AND expiry_date < now()::date;
END;
$$;

SELECT cron.schedule(
  'expire-pre-approvals-daily',
  '0 1 * * *',
  $$ SELECT public.expire_stale_pre_approvals(); $$
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pre-approval-docs', 'pre-approval-docs', false, 10485760, '{"application/pdf","image/jpeg","image/png","image/heic"}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "pre_approval_docs_owner_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pre-approval-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pre_approval_docs_owner_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'pre-approval-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pre_approval_docs_admin_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'pre-approval-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pre_approval_docs_owner_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'pre-approval-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS
ALTER TABLE public.buyer_pre_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pre_approval_owner_read" ON public.buyer_pre_approvals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pre_approval_owner_insert" ON public.buyer_pre_approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pre_approval_admin_select" ON public.buyer_pre_approvals
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pre_approval_admin_update" ON public.buyer_pre_approvals
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pre_approval_agent_read" ON public.buyer_pre_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid()
        AND cp2.user_id = buyer_pre_approvals.user_id
        AND cp1.user_id != cp2.user_id
    )
  );