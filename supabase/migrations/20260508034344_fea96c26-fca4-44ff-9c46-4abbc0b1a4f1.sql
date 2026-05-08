DROP POLICY IF EXISTS "Partners can view their own leads" ON public.partner_buyer_leads;

CREATE POLICY "service_read_partner_leads"
  ON public.partner_buyer_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referral_partners rp
      WHERE rp.user_id = auth.uid()
        AND rp.partner_code = partner_buyer_leads.partner_code
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
