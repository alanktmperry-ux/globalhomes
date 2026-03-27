
-- Consumer profiles table for lead marketplace
CREATE TABLE public.consumer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  buying_situation text NOT NULL DEFAULT 'Just Looking',
  budget_min numeric DEFAULT 0,
  budget_max numeric DEFAULT 0,
  preferred_suburbs text[] DEFAULT '{}',
  preferred_type text DEFAULT 'Any',
  min_bedrooms integer DEFAULT 1,
  trigger_query text,
  search_count integer DEFAULT 0,
  lead_score integer DEFAULT 50,
  purchase_price numeric DEFAULT 29,
  is_purchasable boolean DEFAULT false,
  purchased_by uuid REFERENCES public.agents(id),
  purchased_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consumer_profiles ENABLE ROW LEVEL SECURITY;

-- Agents can read purchasable profiles (without contact details - handled in app)
CREATE POLICY "Agents can view purchasable profiles"
  ON public.consumer_profiles
  FOR SELECT
  TO authenticated
  USING (
    is_purchasable = true
    OR user_id = auth.uid()
    OR purchased_by IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own consumer profile"
  ON public.consumer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own consumer profile"
  ON public.consumer_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role (edge functions) can update for purchases
CREATE POLICY "Service role can update consumer profiles"
  ON public.consumer_profiles
  FOR UPDATE
  TO service_role
  USING (true);
