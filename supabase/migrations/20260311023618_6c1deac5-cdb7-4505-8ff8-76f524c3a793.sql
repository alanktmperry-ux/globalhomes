-- Delete agency_members for duplicate Level 5 agencies (keeping b7d2a2fb)
DELETE FROM public.agency_members WHERE agency_id IN (
  'fa1a6888-053f-4d42-bbdb-43f7fec82c7b',
  'ad3c531b-2a03-4223-b9bf-5e055d0b6e90',
  '838b40e0-0dd9-43d2-8053-0a7933f33895',
  'f683187e-fa69-4a76-a299-a556a9c4c617',
  '0261f2d6-d469-4c0f-9921-a20a065fe92e'
);

-- Delete the duplicate agencies
DELETE FROM public.agencies WHERE id IN (
  'fa1a6888-053f-4d42-bbdb-43f7fec82c7b',
  'ad3c531b-2a03-4223-b9bf-5e055d0b6e90',
  '838b40e0-0dd9-43d2-8053-0a7933f33895',
  'f683187e-fa69-4a76-a299-a556a9c4c617',
  '0261f2d6-d469-4c0f-9921-a20a065fe92e'
);

-- Also enable DELETE on agencies for owners
CREATE POLICY "Owner can delete agency"
ON public.agencies
FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);