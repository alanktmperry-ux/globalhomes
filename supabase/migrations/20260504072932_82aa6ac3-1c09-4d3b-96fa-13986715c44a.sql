UPDATE public.agents
SET 
  approval_status = 'approved',
  is_approved = true
WHERE approval_status IS DISTINCT FROM 'approved';