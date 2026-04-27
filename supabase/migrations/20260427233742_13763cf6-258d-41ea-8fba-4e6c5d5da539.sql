DROP POLICY IF EXISTS "Admins can moderate listings" ON properties;

CREATE POLICY "Admins can moderate listings"
ON properties
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'email') IN (
    'alanktmperry@gmail.com',
    'alan@everythingco.com.au',
    'alan@everythingeco.com.au'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN (
    'alanktmperry@gmail.com',
    'alan@everythingco.com.au',
    'alan@everythingeco.com.au'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);