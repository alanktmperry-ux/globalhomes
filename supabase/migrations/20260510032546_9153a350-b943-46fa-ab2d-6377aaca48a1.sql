ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_profiles_language_preference
ON profiles (language_preference)
WHERE language_preference IS NOT NULL AND language_preference != 'en';

COMMENT ON COLUMN profiles.language_preference IS
  'Phase 2 multilingual. ISO-639-1 or BCP-47 language code (zh-CN, ko, ar, etc). Used by LanguageSwitcher and email translation.';