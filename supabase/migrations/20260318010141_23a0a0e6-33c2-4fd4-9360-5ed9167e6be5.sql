
CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  agency_name text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit demo requests"
ON public.demo_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view demo requests"
ON public.demo_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));
