-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "buyer_insert_offers" ON public.pre_auction_offers;

-- Create a tighter INSERT policy that binds offers to the authenticated user's profile
CREATE POLICY "buyer_insert_offers" ON public.pre_auction_offers
FOR INSERT TO authenticated
WITH CHECK (
  buyer_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);