
-- CONTACTS table (unified buyer/seller database, shared across agency)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  contact_type text NOT NULL DEFAULT 'buyer', -- buyer, seller, landlord, tenant, both
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  mobile text,
  avatar_url text,
  
  -- Address
  address text,
  suburb text,
  state text,
  postcode text,
  country text DEFAULT 'Australia',
  
  -- Buyer preferences
  preferred_suburbs text[] DEFAULT '{}',
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  preferred_beds integer,
  preferred_baths integer,
  preferred_property_types text[] DEFAULT '{}',
  
  -- Seller info
  property_address text,
  property_type text,
  estimated_value numeric(12,2),
  
  -- Pipeline & ranking
  buyer_pipeline_stage text DEFAULT 'cold_lead', -- cold_lead, active_buyer, under_contract, settled
  seller_pipeline_stage text DEFAULT 'cold_lead', -- cold_lead, appraisal, listing_authority, marketing, under_contract, settled
  ranking text NOT NULL DEFAULT 'cold', -- hot, warm, cold
  
  -- Assignment
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  
  -- Notes & metadata
  notes text,
  source text, -- referral, website, open_home, cold_call, csv_import
  tags text[] DEFAULT '{}',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Agency members can view all contacts in their agency
CREATE POLICY "Agency members can view contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (is_agency_member(auth.uid(), agency_id));

-- Agents can also see contacts they created (even if no agency)
CREATE POLICY "Creators can view own contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated can insert contacts" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator or agency admin can update contacts" ON public.contacts
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_agency_owner_or_admin(auth.uid(), agency_id));

CREATE POLICY "Creator or agency admin can delete contacts" ON public.contacts
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_agency_owner_or_admin(auth.uid(), agency_id));

-- CONTACT_ACTIVITIES table (interaction timeline per contact)
CREATE TABLE public.contact_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL, -- call, email, sms, inspection, note, meeting, follow_up, status_change
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

-- Visibility follows contact visibility (agency-shared)
CREATE POLICY "Can view contact activities" ON public.contact_activities
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts
      WHERE created_by = auth.uid() OR is_agency_member(auth.uid(), agency_id)
    )
  );

CREATE POLICY "Authenticated can insert contact activities" ON public.contact_activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Updated_at trigger for contacts
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for contacts
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
