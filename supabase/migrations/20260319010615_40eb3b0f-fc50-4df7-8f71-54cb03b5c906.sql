CREATE POLICY "Admins can delete demo requests"
  ON public.demo_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));