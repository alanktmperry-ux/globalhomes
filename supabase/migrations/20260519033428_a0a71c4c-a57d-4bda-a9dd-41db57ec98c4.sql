CREATE OR REPLACE FUNCTION public.match_properties_semantic(
  query_embedding vector,
  match_count int DEFAULT 20,
  min_similarity float DEFAULT 0.55
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM properties p
  WHERE p.embedding IS NOT NULL
    AND p.is_active = true
    AND p.agent_id IS NOT NULL
    AND COALESCE(p.listing_type, '') <> 'rent'
    AND 1 - (p.embedding <=> query_embedding) >= min_similarity
  ORDER BY p.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_properties_semantic(vector, int, float) TO anon, authenticated;