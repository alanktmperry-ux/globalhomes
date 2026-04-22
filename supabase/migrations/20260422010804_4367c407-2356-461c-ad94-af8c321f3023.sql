-- Allow anonymous users to insert notifications
CREATE POLICY "Allow anon insert notifications"
ON public.notifications
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to insert notifications for any agent
CREATE POLICY "Allow authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);