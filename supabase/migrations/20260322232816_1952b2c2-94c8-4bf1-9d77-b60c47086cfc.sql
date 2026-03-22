-- Remove duplicate agencies keeping the most recent one per owner+name
DELETE FROM public.agencies
WHERE id NOT IN (
  SELECT DISTINCT ON (owner_user_id, name) id
  FROM public.agencies
  ORDER BY owner_user_id, name, created_at DESC
);