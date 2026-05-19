
-- Pitch A/B testing: templates + tracking on responses
CREATE TABLE public.halo_pitch_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_halo_pitch_templates_agent ON public.halo_pitch_templates(agent_id) WHERE is_active = true;

ALTER TABLE public.halo_pitch_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_own_templates" ON public.halo_pitch_templates
  FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "agents_insert_own_templates" ON public.halo_pitch_templates
  FOR INSERT WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "agents_update_own_templates" ON public.halo_pitch_templates
  FOR UPDATE USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "agents_delete_own_templates" ON public.halo_pitch_templates
  FOR DELETE USING (auth.uid() = agent_id);
CREATE POLICY "admins_all_templates" ON public.halo_pitch_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_halo_pitch_templates_updated
  BEFORE UPDATE ON public.halo_pitch_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track which template was used per response
ALTER TABLE public.halo_responses
  ADD COLUMN template_id uuid REFERENCES public.halo_pitch_templates(id) ON DELETE SET NULL,
  ADD COLUMN template_label text;

CREATE INDEX idx_halo_responses_template ON public.halo_responses(template_id) WHERE template_id IS NOT NULL;

-- A/B stats RPC
CREATE OR REPLACE FUNCTION public.get_agent_pitch_ab_stats(_agent_id uuid)
RETURNS TABLE (
  template_id uuid,
  label text,
  is_active boolean,
  sends bigint,
  accepts bigint,
  dismissals bigint,
  accept_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS template_id,
    t.label,
    t.is_active,
    COUNT(r.id) AS sends,
    COUNT(r.id) FILTER (WHERE r.accepted = true) AS accepts,
    COUNT(r.id) FILTER (WHERE r.dismissed_by_seeker = true) AS dismissals,
    CASE WHEN COUNT(r.id) > 0
      THEN ROUND((COUNT(r.id) FILTER (WHERE r.accepted = true))::numeric / COUNT(r.id)::numeric * 100, 1)
      ELSE 0
    END AS accept_rate
  FROM public.halo_pitch_templates t
  LEFT JOIN public.halo_responses r
    ON r.template_id = t.id AND r.body IS NOT NULL
  WHERE t.agent_id = _agent_id
    AND (auth.uid() = _agent_id OR has_role(auth.uid(), 'admin'::app_role))
  GROUP BY t.id, t.label, t.is_active, t.sort_order
  ORDER BY t.sort_order, t.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_pitch_ab_stats(uuid) TO authenticated;
