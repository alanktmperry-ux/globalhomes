
-- Fix: Remove overly permissive waitlist SELECT policy
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON waitlist;
