
CREATE POLICY "Anon can validate demo code"
ON public.demo_requests
FOR SELECT
TO anon
USING (true);
