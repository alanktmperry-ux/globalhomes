-- Fix existing rental properties that were saved before listing_category was
-- included in the pocket listing payload. These properties have listing_type='rent'
-- but listing_category was never set (NULL or defaulted to 'sale'), making them
-- invisible in the /rent search page which filters by listing_category='rent'.

UPDATE properties
SET listing_category = 'rent'
WHERE listing_type = 'rent'
  AND (listing_category IS NULL OR listing_category != 'rent');

-- Also ensure all sale properties are consistently categorised
UPDATE properties
SET listing_category = 'sale'
WHERE listing_type = 'sale'
  AND (listing_category IS NULL OR listing_category != 'sale');
