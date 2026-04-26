-- Convert properties.furnished from boolean to text to support 3-way enum
-- (furnished / unfurnished / partially_furnished)

ALTER TABLE public.properties
  ALTER COLUMN furnished DROP DEFAULT;

ALTER TABLE public.properties
  ALTER COLUMN furnished TYPE text
  USING CASE
    WHEN furnished IS TRUE THEN 'furnished'
    WHEN furnished IS FALSE THEN 'unfurnished'
    ELSE NULL
  END;

ALTER TABLE public.properties
  ALTER COLUMN furnished SET DEFAULT 'unfurnished';

ALTER TABLE public.properties
  ADD CONSTRAINT properties_furnished_check
  CHECK (furnished IS NULL OR furnished IN ('furnished', 'unfurnished', 'partially_furnished'));