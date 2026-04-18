-- 1. Providers table
CREATE TABLE public.home_service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price_from NUMERIC,
  price_to NUMERIC,
  price_unit TEXT DEFAULT 'job',
  suburb TEXT,
  state TEXT DEFAULT 'NSW',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  rating NUMERIC DEFAULT 5.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.home_service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active providers"
ON public.home_service_providers
FOR SELECT
USING (is_active = true);

-- 2. Bookings table
CREATE TABLE public.home_service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.home_service_providers(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  property_address TEXT,
  preferred_date DATE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_rate NUMERIC DEFAULT 0.12,
  commission_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.home_service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a booking"
ON public.home_service_bookings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Agents can view their own bookings"
ON public.home_service_bookings
FOR SELECT
USING (
  agent_id IS NOT NULL
  AND agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);

CREATE INDEX idx_home_service_providers_category ON public.home_service_providers(category) WHERE is_active = true;
CREATE INDEX idx_home_service_bookings_agent ON public.home_service_bookings(agent_id);
CREATE INDEX idx_home_service_bookings_provider ON public.home_service_bookings(provider_id);

-- 3. Seed providers
INSERT INTO public.home_service_providers (name, category, description, price_from, price_to, price_unit, suburb, state, phone, email, rating) VALUES
('Lens & Light Property Photography', 'photography', 'Award-winning real estate photographers. Twilight shots, drone aerials and 24h turnaround on edited galleries.', 280, 650, 'job', 'Surry Hills', 'NSW', '02 8000 1234', 'hello@lensandlight.com.au', 4.9),
('BlueprintWorks Floor Plans', 'floor_plans', '2D and 3D floor plans drawn from on-site measurements. RERA-compliant and ready to upload to portals.', 180, 420, 'job', 'Chatswood', 'NSW', '02 8000 2345', 'plans@blueprintworks.com.au', 4.8),
('StageRight Virtual Staging', 'virtual_staging', 'Photo-realistic virtual furniture in 24 hours. Perfect for vacant properties — pick from 12 styles.', 65, 120, 'room', 'Bondi Junction', 'NSW', '02 8000 3456', 'studio@stageright.com.au', 4.7),
('Sydney Pest Pro', 'pest_inspection', 'Licensed timber pest and termite inspections. Detailed PDF report within 24 hours, accepted by all banks.', 220, 380, 'job', 'Parramatta', 'NSW', '02 8000 4567', 'bookings@sydneypestpro.com.au', 4.9),
('Apex Building Inspections', 'building_inspection', 'Independent pre-purchase building inspections by licensed inspectors. Same-day verbal report available.', 350, 650, 'job', 'North Sydney', 'NSW', '02 8000 5678', 'apex@apexinspect.com.au', 5.0),
('Harbour Conveyancing', 'conveyancing', 'Fixed-fee residential conveyancing across NSW. Online contract review, e-signing and PEXA settlement.', 990, 1650, 'matter', 'Sydney', 'NSW', '02 8000 6789', 'team@harbourconv.com.au', 4.9),
('Sparkle End-of-Lease Cleaning', 'cleaning', 'Bond-back guaranteed end-of-lease and pre-sale cleans. Includes oven, windows and carpet steam.', 180, 480, 'job', 'Marrickville', 'NSW', '02 8000 7890', 'book@sparkleclean.com.au', 4.8),
('Sydney Easy Movers', 'removalists', 'Fully insured local and interstate moves. Two-man crews from $120/hr — packing materials included.', 120, 220, 'hour', 'Alexandria', 'NSW', '02 8000 8901', 'quotes@sydneyeasymovers.com.au', 4.7);