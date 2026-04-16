-- Change default so new agents are immediately approved
ALTER TABLE public.agents ALTER COLUMN approval_status SET DEFAULT 'approved';

-- Approve all currently pending agents
UPDATE public.agents SET approval_status = 'approved' WHERE approval_status = 'pending';