
-- Collab sessions for shared property browsing
CREATE TABLE public.collab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  search_query text NOT NULL DEFAULT '',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  map_center_lat double precision,
  map_center_lng double precision,
  map_zoom integer DEFAULT 12,
  selected_property_id uuid REFERENCES public.properties(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collab_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collab sessions" ON public.collab_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can create sessions" ON public.collab_sessions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can update sessions" ON public.collab_sessions FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Collab reactions on properties within a session
CREATE TABLE public.collab_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, property_id, user_id, emoji)
);

ALTER TABLE public.collab_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions in session" ON public.collab_reactions FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can react" ON public.collab_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own reactions" ON public.collab_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Track partner property views in a session
CREATE TABLE public.collab_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collab_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collab views" ON public.collab_views FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can insert views" ON public.collab_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Enable realtime for collab tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_views;
