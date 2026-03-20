INSERT INTO public.agent_subscriptions (agent_id, plan_type, listing_limit, seat_limit, monthly_price_aud, founding_member)
VALUES ('63539f01-dbcd-4c0c-82ff-0427a60fb2b0', 'pro', 999, 1, 199, false);

UPDATE public.agents SET is_subscribed = true WHERE id = '63539f01-dbcd-4c0c-82ff-0427a60fb2b0';