
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  source text,
  user_agent text,
  ip text
);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- No public access; only service role (edge functions) can read/write.
CREATE POLICY "service role manages unsubscribes"
  ON public.email_unsubscribes
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.is_email_unsubscribed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_unsubscribes WHERE lower(email) = lower(_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_unsubscribed(text) TO anon, authenticated, service_role;
