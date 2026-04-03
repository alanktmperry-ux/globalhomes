
-- Create seller_likelihood_scores table
CREATE TABLE public.seller_likelihood_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  signals jsonb NOT NULL DEFAULT '{}',
  summary text,
  scored_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_seller_likelihood_scores_score ON public.seller_likelihood_scores(score DESC);
CREATE INDEX idx_seller_likelihood_scores_property ON public.seller_likelihood_scores(property_id);

-- Enable RLS
ALTER TABLE public.seller_likelihood_scores ENABLE ROW LEVEL SECURITY;

-- Any authenticated agent can read scores (these are market intelligence)
CREATE POLICY "Authenticated users can view seller likelihood scores"
  ON public.seller_likelihood_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage scores (populated by backend jobs)
CREATE POLICY "Admins can manage seller likelihood scores"
  ON public.seller_likelihood_scores
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
