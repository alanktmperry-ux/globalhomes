-- Auto-approve listings: change defaults so submissions go live immediately
ALTER TABLE public.properties ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.properties ALTER COLUMN status SET DEFAULT 'public';

-- Backfill: any listing currently sitting in the moderation queue (not rejected,
-- not archived) is auto-approved under the new policy.
UPDATE public.properties
SET moderation_status = 'approved'
WHERE moderation_status = 'pending';