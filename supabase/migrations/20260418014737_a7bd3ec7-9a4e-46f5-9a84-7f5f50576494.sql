-- Conveyancers directory
CREATE TABLE public.conveyancers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  fee_from NUMERIC,
  fee_to NUMERIC,
  suburbs_covered TEXT[],
  turnaround_days INTEGER,
  rating NUMERIC DEFAULT 5.0,
  specialties TEXT[],
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conveyancers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active conveyancers"
ON public.conveyancers FOR SELECT
USING (is_active = true);

-- Conveyancing referrals (leads)
CREATE TABLE public.conveyancing_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conveyancer_id UUID REFERENCES public.conveyancers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  property_address TEXT,
  transaction_type TEXT,
  settlement_date DATE,
  special_circumstances TEXT[],
  source TEXT,
  property_id UUID,
  agent_id UUID,
  status TEXT NOT NULL DEFAULT 'new',
  commission_amount NUMERIC DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conveyancing_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a conveyancing referral"
ON public.conveyancing_referrals FOR INSERT
WITH CHECK (true);

-- Seed 5 Australian conveyancing firms
INSERT INTO public.conveyancers (firm_name, contact_name, email, phone, website, fee_from, fee_to, suburbs_covered, turnaround_days, rating, specialties) VALUES
('Sydney Settlements Co.', 'Emma Whitfield', 'hello@sydneysettlements.com.au', '02 9000 1100', 'https://sydneysettlements.com.au', 990, 1200, ARRAY['Sydney CBD','Surry Hills','Newtown','Bondi','Paddington','Mosman'], 30, 4.9, ARRAY['First home buyers','Investment property','Off-the-plan']),
('Harbour City Conveyancing', 'James Patel', 'enquiries@harbourcityconv.com.au', '02 9555 4422', 'https://harbourcityconv.com.au', 950, 1150, ARRAY['North Sydney','Chatswood','Lane Cove','Crows Nest','Manly'], 28, 4.8, ARRAY['Investment property','Foreign buyers (FIRB)','Strata']),
('Melbourne Property Lawyers', 'Sophia Nguyen', 'team@mppropertylaw.com.au', '03 8888 7700', 'https://mppropertylaw.com.au', 890, 1100, ARRAY['Melbourne CBD','Carlton','Fitzroy','South Yarra','Richmond','St Kilda'], 35, 4.9, ARRAY['First home buyers','Off-the-plan','Investment property']),
('Eastside Conveyancing Group', 'Daniel Rossi', 'info@eastsideconv.com.au', '02 9388 2200', 'https://eastsideconv.com.au', 1050, 1200, ARRAY['Bondi Junction','Double Bay','Randwick','Coogee','Maroubra'], 30, 4.7, ARRAY['Luxury property','Foreign buyers (FIRB)','Investment property']),
('Inner West Settlements', 'Olivia Tran', 'hello@iwsettlements.com.au', '02 9544 1188', 'https://iwsettlements.com.au', 920, 1080, ARRAY['Marrickville','Leichhardt','Balmain','Rozelle','Glebe','Annandale'], 32, 4.8, ARRAY['First home buyers','Strata','Off-the-plan']);