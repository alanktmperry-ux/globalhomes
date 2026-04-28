-- Remove hardcoded admin email policies on properties; rely on has_role()
DROP POLICY IF EXISTS "Admin emails can delete listings" ON public.properties;
DROP POLICY IF EXISTS "Admin emails can moderate listings" ON public.properties;
DROP POLICY IF EXISTS "Admins can moderate listings" ON public.properties;

-- Ensure admins can still delete properties (previously only the email-based policy allowed this)
CREATE POLICY "Admins can delete all properties"
ON public.properties
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));