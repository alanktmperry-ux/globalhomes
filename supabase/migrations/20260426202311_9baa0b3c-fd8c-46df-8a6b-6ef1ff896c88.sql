-- 1. Prevent non-admins from modifying user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Only service role can modify roles" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- 2. Strata schemes — managers see only their own
ALTER TABLE public.strata_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strata managers see own schemes" ON public.strata_schemes
  FOR ALL USING (
    strata_manager_id IN (SELECT id FROM public.strata_managers WHERE user_id = auth.uid())
  );

-- 3. Partner agencies — partners see only their own
ALTER TABLE public.partner_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners see own agencies" ON public.partner_agencies
  FOR ALL USING (
    partner_id IN (SELECT partner_id FROM public.partner_members WHERE user_id = auth.uid())
  );