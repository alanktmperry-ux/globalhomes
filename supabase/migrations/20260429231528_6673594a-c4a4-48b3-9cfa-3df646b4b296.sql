ALTER TABLE public.agents ALTER COLUMN approval_status SET DEFAULT 'pending';

INSERT INTO public.user_roles (user_id, role)
VALUES ('aa812c93-918f-4eb5-8d40-fcf354599482', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;