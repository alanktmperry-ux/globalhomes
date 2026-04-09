
-- Revoke SELECT on sensitive auction columns from public roles
REVOKE SELECT (reserve_price, vendor_bid_limit) ON public.auctions FROM anon, authenticated;

-- Grant back to the table owner (postgres) so service role still works
GRANT SELECT (reserve_price, vendor_bid_limit) ON public.auctions TO postgres, service_role;

-- Create a SECURITY DEFINER function for the owning agent to read their own sensitive auction data
CREATE OR REPLACE FUNCTION public.get_auction_sensitive(p_auction_id uuid)
RETURNS TABLE(reserve_price numeric, vendor_bid_limit integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.reserve_price, a.vendor_bid_limit
  FROM public.auctions a
  WHERE a.id = p_auction_id
    AND a.agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid());
$$;
