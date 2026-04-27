CREATE POLICY "Admin emails can moderate listings"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'alanktmperry@gmail.com',
    'alan@everythingco.com.au',
    'alan@everythingeco.com.au'
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'alanktmperry@gmail.com',
    'alan@everythingco.com.au',
    'alan@everythingeco.com.au'
  )
);

CREATE POLICY "Admin emails can delete listings"
ON public.properties
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'alanktmperry@gmail.com',
    'alan@everythingco.com.au',
    'alan@everythingeco.com.au'
  )
);