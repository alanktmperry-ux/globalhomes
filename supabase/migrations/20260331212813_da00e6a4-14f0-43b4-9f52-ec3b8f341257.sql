-- Add listing_category to properties for sale/rent distinction
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_category text NOT NULL DEFAULT 'sale';

-- Add rental-specific columns not already present
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS bond_amount numeric,
  ADD COLUMN IF NOT EXISTS min_lease_months int,
  ADD COLUMN IF NOT EXISTS parking_notes text,
  ADD COLUMN IF NOT EXISTS utilities_included text[];

-- Index for rental search
CREATE INDEX IF NOT EXISTS idx_properties_rental
  ON properties (listing_category, listing_status, suburb, state, rental_weekly);

-- Add listing_category to saved_searches
ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS listing_category text DEFAULT 'sale';

-- Extend rental_applications with new fields
ALTER TABLE rental_applications
  ADD COLUMN IF NOT EXISTS applicant_id uuid,
  ADD COLUMN IF NOT EXISTS time_at_address text,
  ADD COLUMN IF NOT EXISTS income_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS move_in_date date,
  ADD COLUMN IF NOT EXISTS lease_term_months int,
  ADD COLUMN IF NOT EXISTS occupants int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS has_pets boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_description text,
  ADD COLUMN IF NOT EXISTS additional_notes text,
  ADD COLUMN IF NOT EXISTS co_applicants jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pm_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();

-- Add validation trigger for listing_category
CREATE OR REPLACE FUNCTION public.validate_listing_category()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.listing_category NOT IN ('sale', 'rent') THEN
    RAISE EXCEPTION 'Invalid listing_category: %', NEW.listing_category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_listing_category
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION validate_listing_category();

-- RLS policy: applicants can view their own applications
CREATE POLICY "Applicants view own rental apps"
  ON rental_applications FOR SELECT
  USING (auth.uid()::text = applicant_id::text OR auth.uid()::text = user_id::text);

-- RLS policy: agents can manage applications for their properties
CREATE POLICY "Agents manage rental apps for their properties"
  ON rental_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN agents a ON a.id = p.agent_id
      WHERE p.id = rental_applications.property_id
        AND a.user_id = auth.uid()
    )
  );