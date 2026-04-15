ALTER TABLE public.user_preferences
ADD COLUMN notification_preferences jsonb DEFAULT NULL;