DROP POLICY IF EXISTS "Anon can validate demo code" ON public.demo_requests;
DROP POLICY IF EXISTS "Authenticated can validate demo code" ON public.demo_requests;
DROP POLICY IF EXISTS "Anon can redeem demo code" ON public.demo_requests;
DROP POLICY IF EXISTS "Authenticated can redeem demo code" ON public.demo_requests;