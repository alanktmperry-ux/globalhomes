-- schema-snapshot
-- Full readable snapshot of the current public schema structure.
-- Run in the Supabase SQL editor to capture tables, columns, types, and constraints at any point in time.
--
-- To save as a named query in Supabase:
--   1. Open the SQL Editor in the Supabase dashboard
--   2. Paste this query and click "Save"
--   3. Name it: schema-snapshot

WITH columns AS (
  SELECT
    c.table_schema,
    c.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
),
constraints AS (
  SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    string_agg(DISTINCT tc.constraint_type, ', ' ORDER BY tc.constraint_type) AS constraint_types,
    string_agg(DISTINCT tc.constraint_name, ', ') AS constraint_names
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
   AND kcu.table_name = tc.table_name
  WHERE tc.table_schema = 'public'
  GROUP BY tc.table_schema, tc.table_name, kcu.column_name
)
SELECT
  col.table_name,
  col.column_name,
  col.ordinal_position,
  col.data_type,
  col.udt_name,
  col.is_nullable,
  col.column_default,
  col.character_maximum_length,
  col.numeric_precision,
  col.numeric_scale,
  con.constraint_types,
  con.constraint_names
FROM columns col
LEFT JOIN constraints con
  ON con.table_schema = col.table_schema
 AND con.table_name = col.table_name
 AND con.column_name = col.column_name
ORDER BY col.table_name, col.ordinal_position;
