
-- Add new columns to agents table
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS title_position TEXT DEFAULT 'Agent',
  ADD COLUMN IF NOT EXISTS verification_badge_level TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Create agent_credentials table
CREATE TABLE public.agent_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  verified_status TEXT NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.agent_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own credentials" ON public.agent_credentials
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can insert own credentials" ON public.agent_credentials
  FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can delete own credentials" ON public.agent_credentials
  FOR DELETE USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all credentials" ON public.agent_credentials
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update credentials" ON public.agent_credentials
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create agent_subscriptions table
CREATE TABLE public.agent_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'basic',
  listing_limit INTEGER NOT NULL DEFAULT 3,
  featured_remaining INTEGER NOT NULL DEFAULT 0,
  subscription_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_end TIMESTAMP WITH TIME ZONE,
  payment_method JSONB DEFAULT '{}'::jsonb,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own subscription" ON public.agent_subscriptions
  FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage subscriptions" ON public.agent_subscriptions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create buyer_profiles table
CREATE TABLE public.buyer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  preferred_countries TEXT[] DEFAULT '{}'::text[],
  preferred_property_types TEXT[] DEFAULT '{}'::text[],
  budget_min INTEGER,
  budget_max INTEGER,
  saved_searches JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own buyer profile" ON public.buyer_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buyer profile" ON public.buyer_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buyer profile" ON public.buyer_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for agent-documents bucket
CREATE POLICY "Agents can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Agents can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Agents can delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
