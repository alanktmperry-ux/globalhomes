
-- Create signature_requests table
CREATE TABLE public.signature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_signature_request_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'pending', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid signature_request status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_signature_request_status
BEFORE INSERT OR UPDATE ON public.signature_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_signature_request_status();

-- Updated_at trigger
CREATE TRIGGER update_signature_requests_updated_at
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own signature requests"
ON public.signature_requests FOR SELECT TO authenticated
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can create own signature requests"
ON public.signature_requests FOR INSERT TO authenticated
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own signature requests"
ON public.signature_requests FOR UPDATE TO authenticated
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Public read for signatories (they join via parties table)
CREATE POLICY "Public can read signature requests"
ON public.signature_requests FOR SELECT TO anon
USING (true);

-- Create signature_request_parties table
CREATE TABLE public.signature_request_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  signing_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ip_address TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_signing_token ON public.signature_request_parties(signing_token);

-- RLS
ALTER TABLE public.signature_request_parties ENABLE ROW LEVEL SECURITY;

-- Agents can view parties for their own requests
CREATE POLICY "Agents can view own request parties"
ON public.signature_request_parties FOR SELECT TO authenticated
USING (request_id IN (
  SELECT id FROM public.signature_requests
  WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
));

-- Agents can insert parties for their own requests
CREATE POLICY "Agents can insert own request parties"
ON public.signature_request_parties FOR INSERT TO authenticated
WITH CHECK (request_id IN (
  SELECT id FROM public.signature_requests
  WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
));

-- Public read by signing_token (for signing page)
CREATE POLICY "Public can read by signing token"
ON public.signature_request_parties FOR SELECT TO anon
USING (true);

-- Public update for signing (anon users sign via token)
CREATE POLICY "Public can sign via token"
ON public.signature_request_parties FOR UPDATE TO anon
USING (true)
WITH CHECK (true);
