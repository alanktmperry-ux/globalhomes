
-- Remove notifications for leads that have been archived
DELETE FROM public.notifications
WHERE lead_id IS NOT NULL
  AND lead_id IN (
    SELECT id FROM public.leads WHERE archived_at IS NOT NULL
  );

-- Remove notifications for leads no longer in the database
DELETE FROM public.notifications
WHERE lead_id IS NOT NULL
  AND lead_id NOT IN (SELECT id FROM public.leads);
