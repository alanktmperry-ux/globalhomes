-- Remove the duplicate older agency (keep the newer one)
DELETE FROM agency_invite_codes WHERE agency_id = 'df9da9ce-3ec9-4d8a-b3df-228bb3667bb3';
DELETE FROM agency_members WHERE agency_id = 'df9da9ce-3ec9-4d8a-b3df-228bb3667bb3';
DELETE FROM agencies WHERE id = 'df9da9ce-3ec9-4d8a-b3df-228bb3667bb3';

-- Prevent same owner creating duplicate agency names
CREATE UNIQUE INDEX IF NOT EXISTS agencies_owner_name_unique ON public.agencies (owner_user_id, name);