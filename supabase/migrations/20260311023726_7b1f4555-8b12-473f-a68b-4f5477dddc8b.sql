CREATE POLICY "Owner or admin can delete invite codes"
ON public.agency_invite_codes
FOR DELETE
TO authenticated
USING (is_agency_owner_or_admin(auth.uid(), agency_id));