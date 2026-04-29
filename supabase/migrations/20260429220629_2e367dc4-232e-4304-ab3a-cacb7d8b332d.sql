-- Add seeker-side tracking to halo_responses
ALTER TABLE public.halo_responses
  ADD COLUMN IF NOT EXISTS viewed_by_seeker BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.halo_responses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Index to speed up unread-count queries by halo
CREATE INDEX IF NOT EXISTS halo_responses_halo_unread_idx
  ON public.halo_responses (halo_id) WHERE viewed_by_seeker = false;

-- Allow seekers to update viewed_by_seeker on responses to their own halos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'halo_responses'
      AND policyname = 'Seekers can mark responses on their halos as viewed'
  ) THEN
    CREATE POLICY "Seekers can mark responses on their halos as viewed"
      ON public.halo_responses
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.halos h
          WHERE h.id = halo_responses.halo_id
            AND h.seeker_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.halos h
          WHERE h.id = halo_responses.halo_id
            AND h.seeker_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow seekers to read responses to their own halos (for inbox / bell)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'halo_responses'
      AND policyname = 'Seekers can view responses to their own halos'
  ) THEN
    CREATE POLICY "Seekers can view responses to their own halos"
      ON public.halo_responses
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.halos h
          WHERE h.id = halo_responses.halo_id
            AND h.seeker_id = auth.uid()
        )
      );
  END IF;
END $$;