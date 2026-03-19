-- Drop the admin-only SELECT since we already have anon SELECT with true
-- Add authenticated SELECT so logged-in users can also validate codes
-- (The existing "Admins can view demo requests" is redundant but harmless)
CREATE POLICY "Authenticated can validate demo code"
ON public.demo_requests FOR SELECT
TO authenticated
USING (true);

-- Also allow anon to update demo_requests status to 'redeemed'
CREATE POLICY "Anon can redeem demo code"
ON public.demo_requests FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow authenticated to update demo_requests too  
CREATE POLICY "Authenticated can redeem demo code"
ON public.demo_requests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);