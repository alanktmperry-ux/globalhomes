# Supabase saved queries

This folder holds reusable SQL queries that should be saved into the Supabase SQL editor as named queries.

## How to save into the dashboard

1. Open the Supabase **SQL Editor**.
2. Paste the contents of the `.sql` file.
3. Click **Save** and use the file name (without extension) as the query name.

## Queries

| File | Suggested name | Purpose |
|------|----------------|---------|
| `schema-snapshot.sql` | `schema-snapshot` | Full snapshot of all public tables, columns, types, and constraints. |

## Migration rule

> **Never drop columns or tables in production — only add. Deprecate by renaming with a `_deprecated` suffix.**

See `supabase/MIGRATION_TEMPLATE.sql` for the standard header to copy into every new migration.
