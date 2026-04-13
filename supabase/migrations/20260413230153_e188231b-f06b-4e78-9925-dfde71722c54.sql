
-- Allow unauthenticated buyers to submit enquiries
CREATE POLICY "anon_lead_insert"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to insert notifications (needed for agent bell on public enquiry)
CREATE POLICY "anon_notification_insert"
ON public.notifications
FOR INSERT
TO anon
WITH CHECK (true);
