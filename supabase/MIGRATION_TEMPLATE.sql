-- Never drop columns or tables in production — only add. Deprecate by renaming with a _deprecated suffix.
--
-- Migration: <short_description>
-- Author: <name>
-- Date: <YYYY-MM-DD>
--
-- Guidelines:
--   * Additive changes only (CREATE, ADD COLUMN, ADD CONSTRAINT NOT VALID, etc.)
--   * To remove a column: ALTER TABLE x RENAME COLUMN y TO y_deprecated;
--   * To remove a table:  ALTER TABLE x RENAME TO x_deprecated;
--   * Always include RLS policies for new tables.
--   * Use .maybeSingle() on the client side, never .single().

-- Your SQL below:

