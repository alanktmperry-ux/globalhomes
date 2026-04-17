INSERT INTO public.user_roles (user_id, role)
SELECT a.user_id, 'agent'::public.app_role
FROM public.agents a
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = a.user_id
  AND ur.role = 'agent'::public.app_role
)
ON CONFLICT DO NOTHING;