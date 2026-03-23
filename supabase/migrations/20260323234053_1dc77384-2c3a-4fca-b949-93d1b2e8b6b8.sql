CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('all','trial','expiring','paid','never_listed','at_risk')),
  send_method text NOT NULL CHECK (send_method IN ('in_app','email','both')),
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  audience text,
  category text DEFAULT 'general' CHECK (category IN ('general','trial_conversion','activation','retention','announcement')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage campaigns' AND tablename = 'broadcast_campaigns') THEN
    CREATE POLICY "Admins manage campaigns" ON public.broadcast_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage templates' AND tablename = 'message_templates') THEN
    CREATE POLICY "Admins manage templates" ON public.message_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

INSERT INTO public.message_templates (name,subject,body,audience,category) VALUES
('Trial Expiry Warning','Your ListHQ trial ends in 7 days',E'Hi {{name}},\n\nYour 60-day free trial expires in 7 days.\n\nStarter is $99/mo. Pro is $199/mo unlimited.\n\nReply if you have questions.\n\nTeam ListHQ','expiring','trial_conversion'),
('Activation — No Listing Yet','Let''s get your first listing live',E'Hi {{name}},\n\nYou signed up but haven''t listed yet. Takes 3 minutes — paste your REA or Domain URL and we pull the details automatically.\n\nTeam ListHQ','never_listed','activation'),
('Re-engagement — At Risk','We noticed you haven''t logged in recently',E'Hi {{name}},\n\nWe noticed you haven''t logged in for a while. A lot has changed — voice search in 24 languages, trust accounting, and REA import.\n\nLog in and take a look.\n\nTeam ListHQ','at_risk','retention'),
('Platform Announcement','New on ListHQ: [Feature Name]',E'Hi {{name}},\n\nWe''ve just launched [Feature Name].\n\n[One sentence on what it does.]\n\nLog in to try it.\n\nTeam ListHQ','all','announcement')
ON CONFLICT DO NOTHING;