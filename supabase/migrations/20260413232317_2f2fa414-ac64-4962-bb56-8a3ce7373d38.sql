DROP POLICY IF EXISTS "anon_notification_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "agents_can_manage_notifications" ON public.notifications;

CREATE POLICY "allow_notification_insert"
ON public.notifications
FOR INSERT
WITH CHECK (true);