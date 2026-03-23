
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  reviewer_name text NOT NULL,
  reviewer_email text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL CHECK (char_length(review_text) BETWEEN 10 AND 1000),
  relationship text NOT NULL DEFAULT 'client',
  reply_text text,
  replied_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_name text,
  client_email text,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved reviews are public" ON public.agent_reviews FOR SELECT TO anon, authenticated USING (status = 'approved');

CREATE POLICY "Agents see own reviews" ON public.agent_reviews FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can submit review" ON public.agent_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Agents manage own requests" ON public.review_requests FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_agent_rating(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.agents SET
    review_count = (SELECT COUNT(*) FROM public.agent_reviews WHERE agent_id = p_agent_id AND status = 'approved'),
    avg_rating = (SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) FROM public.agent_reviews WHERE agent_id = p_agent_id AND status = 'approved'),
    updated_at = now()
  WHERE id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_review_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  IF NEW.status != OLD.status OR TG_OP = 'INSERT' THEN
    PERFORM public.refresh_agent_rating(NEW.agent_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER review_status_change AFTER INSERT OR UPDATE ON public.agent_reviews FOR EACH ROW EXECUTE FUNCTION public.on_review_status_change();
