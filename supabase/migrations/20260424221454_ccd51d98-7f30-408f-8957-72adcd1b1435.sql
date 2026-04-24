
ALTER TABLE public.contacts
  ADD COLUMN preferred_language text;

COMMENT ON COLUMN public.contacts.preferred_language IS
  'Contact''s preferred communication language. Codes match src/shared/lib/i18n.tsx keys (e.g. en, zh_simplified, zh_traditional, vi, ar, hi). Nullable — when null, fall back to agency default.';
