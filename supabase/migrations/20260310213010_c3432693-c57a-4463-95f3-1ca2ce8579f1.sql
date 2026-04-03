
-- Add status column with default 'public' to preserve existing behavior
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'public';

-- Migrate existing data: inactive listings become 'sold'
UPDATE public.properties SET status = 'sold' WHERE is_active = false;
