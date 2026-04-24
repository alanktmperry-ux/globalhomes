-- Remove all scraped/external listings (Demo Agent's pending rows from the Firecrawl/import scraper)
-- Preserves real seed data tagged 'demo_batch:alan_2026'
DELETE FROM public.properties
WHERE agent_id = '065c03ce-9206-44fa-ab80-79876160c8d2'
  AND status = 'pending'
  AND NOT ('demo_batch:alan_2026' = ANY(COALESCE(tags, ARRAY[]::text[])));

-- Also catch any future-shape scraped rows matching the user's title/address heuristics
DELETE FROM public.properties
WHERE (status = 'pending' OR status IS NULL)
  AND NOT ('demo_batch:alan_2026' = ANY(COALESCE(tags, ARRAY[]::text[])))
  AND (
    title ILIKE '%Properties for%sale%in%'
    OR title ILIKE '%Houses for Sale in%'
    OR title ILIKE '%for sale in%VIC%'
    OR title ILIKE '%Know your market%'
    OR address ILIKE '%domainstatic.com.au%'
    OR address ILIKE '%domain.com.au%'
    OR address ILIKE '%realestate.com.au%'
  );