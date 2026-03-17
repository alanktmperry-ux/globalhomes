
-- Rental applications table
CREATE TABLE public.rental_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  agent_id uuid REFERENCES public.agents(id),
  user_id uuid,
  reference_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',

  -- Step 1: Personal
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  current_address text NOT NULL,

  -- Step 2: Employment
  employment_status text NOT NULL,
  employer_name text,
  annual_income numeric,
  employment_length text,

  -- Step 3: Rental History
  previous_address text,
  previous_landlord_name text,
  previous_landlord_contact text,
  reason_for_leaving text,

  -- Step 4: Identity
  identity_document_url text,
  identity_document_type text,

  -- Step 5: Message
  message_to_landlord text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can submit rental applications"
  ON public.rental_applications FOR INSERT
  TO public
  WITH CHECK (true);

-- Applicants can view own
CREATE POLICY "Users can view own applications"
  ON public.rental_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Agents can view applications for their properties
CREATE POLICY "Agents can view property applications"
  ON public.rental_applications FOR SELECT
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Agents can update status
CREATE POLICY "Agents can update application status"
  ON public.rental_applications FOR UPDATE
  TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Storage bucket for application documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('rental-applications', 'rental-applications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload application docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rental-applications');

CREATE POLICY "Users can view own application docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'rental-applications' AND (storage.foldername(name))[3] = auth.uid()::text);

CREATE POLICY "Agents can view application docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'rental-applications');
