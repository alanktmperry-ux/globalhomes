
-- Add opening_balance and current_balance columns
ALTER TABLE trust_accounts ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0;
ALTER TABLE trust_accounts ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0;

-- Backfill from existing balance column
UPDATE trust_accounts SET opening_balance = COALESCE(balance, 0), current_balance = COALESCE(balance, 0) WHERE opening_balance = 0 AND current_balance = 0 AND balance != 0;

-- Ensure RLS policy exists
DROP POLICY IF EXISTS "Agent manages own trust accounts" ON trust_accounts;
CREATE POLICY "Agent manages own trust accounts"
  ON trust_accounts FOR ALL TO authenticated
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
