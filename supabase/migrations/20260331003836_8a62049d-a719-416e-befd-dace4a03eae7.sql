
-- Clean up stale notifications for archived leads
DELETE FROM public.notifications
WHERE lead_id IS NOT NULL
  AND lead_id IN (
    SELECT id FROM public.leads WHERE archived_at IS NOT NULL
  );

-- Clean up notifications for permanently deleted leads
DELETE FROM public.notifications
WHERE lead_id IS NOT NULL
  AND lead_id NOT IN (SELECT id FROM public.leads);
