DROP VIEW IF EXISTS public.broker_leads_view;

CREATE VIEW public.broker_leads_view AS
SELECT
  rl.id,
  rl.buyer_name,
  rl.buyer_email,
  rl.buyer_phone,
  rl.buyer_language,
  rl.loan_type,
  rl.estimated_loan_amount,
  rl.message,
  rl.status,
  rl.assigned_broker_id AS broker_id,
  rl.created_at,
  rl.fee_agreed,
  rl.fee_agreed_at,
  to_char(rl.created_at, 'YYYY-MM') AS invoice_month,
  p.address AS property_address,
  p.price AS property_price,
  CASE WHEN rl.status = 'settled' THEN true ELSE false END AS is_qualified,
  75.00 AS lead_fee_aud
FROM public.referral_leads rl
LEFT JOIN public.properties p ON p.id = rl.property_id;