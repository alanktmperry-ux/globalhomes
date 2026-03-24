
UPDATE properties 
SET is_featured = true, 
    featured_until = now() + interval '90 days', 
    boost_tier = 'premier'
WHERE agent_id = '53fd551f-a2de-4dbe-ab25-7045bf641e55';

UPDATE agents 
SET is_subscribed = true, 
    subscription_expires_at = now() + interval '90 days'
WHERE id = '53fd551f-a2de-4dbe-ab25-7045bf641e55';

INSERT INTO agent_subscriptions (agent_id, plan_type, listing_limit, seat_limit, subscription_end, auto_renew, monthly_price_aud, founding_member)
VALUES ('53fd551f-a2de-4dbe-ab25-7045bf641e55', 'pro', 50, 5, now() + interval '90 days', false, 19900, true)
ON CONFLICT (agent_id) DO UPDATE SET 
  plan_type = 'pro', 
  listing_limit = 50, 
  seat_limit = 5, 
  subscription_end = now() + interval '90 days',
  monthly_price_aud = 19900,
  founding_member = true,
  updated_at = now();
