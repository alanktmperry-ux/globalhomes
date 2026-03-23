
-- Review requests table (agent sends link to client)
CREATE TABLE public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  client_name text,
  client_email text,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own review requests"
  ON public.review_requests FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own review requests"
  ON public.review_requests FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own review requests"
  ON public.review_requests FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read review request by token"
  ON public.review_requests FOR SELECT TO anon, authenticated
  USING (true);

-- Agent reviews table
CREATE TABLE public.agent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  relationship text NOT NULL DEFAULT 'buyer',
  reply_text text,
  replied_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own reviews"
  ON public.agent_reviews FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update own reviews"
  ON public.agent_reviews FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert reviews"
  ON public.agent_reviews FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view approved reviews"
  ON public.agent_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Update review_requests to allow anon updates (marking as used)
CREATE POLICY "Anyone can mark request as used"
  ON public.review_requests FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (used = true);

-- Function to update agent rating/review_count
CREATE OR REPLACE FUNCTION public.update_agent_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agents SET
    rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.agent_reviews WHERE agent_id = NEW.agent_id AND status = 'approved'), 0),
    review_count = (SELECT COUNT(*) FROM public.agent_reviews WHERE agent_id = NEW.agent_id AND status = 'approved'),
    updated_at = now()
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_agent_review_stats
  AFTER INSERT OR UPDATE ON public.agent_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_review_stats();
