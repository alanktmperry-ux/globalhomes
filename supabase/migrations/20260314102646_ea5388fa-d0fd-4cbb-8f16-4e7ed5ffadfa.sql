-- Allow authenticated buyers to view leads they submitted
CREATE POLICY "Buyers can view own leads"
ON public.leads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());