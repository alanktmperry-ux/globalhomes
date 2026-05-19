-- Allow agents to update their own response body, suggested properties, and outcome
CREATE POLICY "Agents can update own response content"
ON public.halo_responses
FOR UPDATE
TO authenticated
USING (agent_id = auth.uid())
WITH CHECK (agent_id = auth.uid());