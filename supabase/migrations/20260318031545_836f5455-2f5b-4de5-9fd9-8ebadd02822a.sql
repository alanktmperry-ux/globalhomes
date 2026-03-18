ALTER TABLE public.demo_requests 
ADD COLUMN demo_code text,
ADD COLUMN demo_code_expires_at timestamptz;