
CREATE POLICY "Admins can update demo requests"
ON public.demo_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));
