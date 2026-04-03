
-- Add strata_manager to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'strata_manager';

-- Strata Managers table
CREATE TABLE public.strata_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  licence_number TEXT,
  state TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  abn TEXT,
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.strata_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strata_managers_own_access" ON public.strata_managers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "strata_managers_public_read" ON public.strata_managers
  FOR SELECT USING (verified = true);

-- Strata Schemes table
CREATE TABLE public.strata_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strata_manager_id UUID REFERENCES public.strata_managers(id) ON DELETE SET NULL,
  scheme_name TEXT NOT NULL,
  address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  total_lots INTEGER NOT NULL DEFAULT 1,
  year_built INTEGER,
  building_type TEXT CHECK (building_type IN ('Residential', 'Mixed Use', 'Commercial', 'Serviced Apartments')),
  admin_fund_levy_per_lot NUMERIC(10,2),
  capital_works_levy_per_lot NUMERIC(10,2),
  sinking_fund_balance NUMERIC(12,2),
  sinking_fund_target NUMERIC(12,2),
  capital_works_plan_year INTEGER,
  special_levy_issued_5yr BOOLEAN DEFAULT false,
  special_levy_amount NUMERIC(12,2),
  special_levy_reason TEXT,
  special_levy_year INTEGER,
  building_defects_disclosed BOOLEAN DEFAULT false,
  defect_bond_active BOOLEAN DEFAULT false,
  defect_description TEXT,
  agm_last_held DATE,
  strata_health_score NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strata_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schemes_manager_write" ON public.strata_schemes
  FOR ALL USING (
    strata_manager_id IN (
      SELECT id FROM public.strata_managers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "schemes_public_read" ON public.strata_schemes
  FOR SELECT USING (true);

-- Strata Listing Data table (joins to properties)
CREATE TABLE public.strata_listing_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  scheme_id UUID REFERENCES public.strata_schemes(id) ON DELETE SET NULL,
  admin_levy_per_lot NUMERIC(10,2),
  capital_works_levy_per_lot NUMERIC(10,2),
  total_quarterly_levy NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(admin_levy_per_lot, 0) + COALESCE(capital_works_levy_per_lot, 0)
  ) STORED,
  special_levy_active BOOLEAN DEFAULT false,
  special_levy_amount NUMERIC(12,2),
  strata_health_score NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id)
);

ALTER TABLE public.strata_listing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strata_listing_data_public_read" ON public.strata_listing_data
  FOR SELECT USING (true);

CREATE POLICY "strata_listing_data_agent_write" ON public.strata_listing_data
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.properties WHERE agent_id IN (
        SELECT id FROM public.agents WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger to compute strata health score
CREATE OR REPLACE FUNCTION public.trigger_compute_strata_health_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/compute-strata-health-score',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    ),
    body := jsonb_build_object('scheme_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER on_strata_scheme_change
AFTER INSERT OR UPDATE ON public.strata_schemes
FOR EACH ROW EXECUTE FUNCTION public.trigger_compute_strata_health_score();

-- Enable realtime for strata_schemes
ALTER PUBLICATION supabase_realtime ADD TABLE public.strata_schemes;
