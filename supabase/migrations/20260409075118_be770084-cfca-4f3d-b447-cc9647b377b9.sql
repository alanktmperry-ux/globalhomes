
-- =============================================
-- rental_applications: RLS + SELECT policies
-- =============================================
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive existing SELECT policies
DROP POLICY IF EXISTS "Applicants see own applications" ON rental_applications;
DROP POLICY IF EXISTS "Agents see property applications" ON rental_applications;
DROP POLICY IF EXISTS "Admins see all applications" ON rental_applications;

CREATE POLICY "Applicants see own applications"
  ON rental_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Agents see property applications"
  ON rental_applications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = rental_applications.property_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins see all applications"
  ON rental_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- rent_payments: ensure RLS + proper SELECT policies
-- =============================================
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Agents can view rent payments for their properties" ON rent_payments;
DROP POLICY IF EXISTS "Agents can insert rent payments for their properties" ON rent_payments;
DROP POLICY IF EXISTS "Agents can update rent payments for their properties" ON rent_payments;
DROP POLICY IF EXISTS "Agent sees own property payments" ON rent_payments;
DROP POLICY IF EXISTS "Admins see all rent payments" ON rent_payments;

CREATE POLICY "Agent sees own property payments"
  ON rent_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = rent_payments.property_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can insert rent payments for their properties"
  ON rent_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = rent_payments.property_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update rent payments for their properties"
  ON rent_payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = rent_payments.property_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins see all rent payments"
  ON rent_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
