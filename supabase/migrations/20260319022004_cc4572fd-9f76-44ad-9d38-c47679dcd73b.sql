
-- Create buyer_briefs table
CREATE TABLE public.buyer_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  property_type TEXT NOT NULL DEFAULT 'House',
  min_beds INTEGER NOT NULL DEFAULT 1,
  max_beds INTEGER NOT NULL DEFAULT 5,
  min_price INTEGER NOT NULL DEFAULT 0,
  max_price INTEGER NOT NULL DEFAULT 10000000,
  suburbs TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  urgency TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_briefs ENABLE ROW LEVEL SECURITY;

-- Agents can insert their own briefs
CREATE POLICY "Agents can insert own briefs"
  ON public.buyer_briefs FOR INSERT
  TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Agents can update own briefs
CREATE POLICY "Agents can update own briefs"
  ON public.buyer_briefs FOR UPDATE
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Agents can delete own briefs
CREATE POLICY "Agents can delete own briefs"
  ON public.buyer_briefs FOR DELETE
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- All authenticated agents can view active briefs (network marketplace)
CREATE POLICY "Authenticated can view active briefs"
  ON public.buyer_briefs FOR SELECT
  TO authenticated
  USING (is_active = true OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
