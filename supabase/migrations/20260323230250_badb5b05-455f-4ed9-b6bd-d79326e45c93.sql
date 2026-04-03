CREATE TABLE IF NOT EXISTS
  public.broadcast_campaigns (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL
    CHECK (audience IN (
      'all', 'trial', 'expiring',
      'paid', 'never_listed',
      'at_risk'
    )),
  send_method text NOT NULL
    CHECK (send_method IN (
      'in_app', 'email', 'both'
    )),
  recipient_count integer
    DEFAULT 0,
  sent_count integer DEFAULT 0,
  status text NOT NULL
    DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sending',
      'sent', 'failed'
    )),
  sent_at timestamptz,
  created_by uuid REFERENCES
    auth.users(id),
  created_at timestamptz NOT NULL
    DEFAULT now()
);

CREATE TABLE IF NOT EXISTS
  public.message_templates (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  audience text,
  category text DEFAULT 'general'
    CHECK (category IN (
      'general',
      'trial_conversion',
      'activation',
      'retention',
      'announcement'
    )),
  created_at timestamptz NOT NULL
    DEFAULT now()
);

ALTER TABLE
  public.broadcast_campaigns
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  public.message_templates
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Admins manage campaigns"
  ON public.broadcast_campaigns
  FOR ALL TO authenticated
  USING (
    public.has_role(
      auth.uid(), 'admin'
    )
  )
  WITH CHECK (
    public.has_role(
      auth.uid(), 'admin'
    )
  );

CREATE POLICY
  "Admins manage templates"
  ON public.message_templates
  FOR ALL TO authenticated
  USING (
    public.has_role(
      auth.uid(), 'admin'
    )
  )
  WITH CHECK (
    public.has_role(
      auth.uid(), 'admin'
    )
  );

INSERT INTO public.message_templates
  (name, subject, body,
  audience, category)
VALUES
(
  'Trial Expiry Warning',
  'Your ListHQ trial ends in 7 days',
  E'Hi {{name}},\n\nYour 60-day free trial on ListHQ expires in 7 days.\n\nEverything you''ve set up — your listings, trust account, contacts and leads — stays with you when you upgrade.\n\nStarter is $99/mo and gives you up to 10 active listings. Pro at $199/mo is unlimited.\n\nReply to this email if you have any questions or want to talk through the right plan for your business.\n\nTeam ListHQ',
  'expiring',
  'trial_conversion'
),
(
  'Activation — No Listing Yet',
  'Let''s get your first listing live',
  E'Hi {{name}},\n\nYou signed up to ListHQ but haven''t listed a property yet.\n\nYour first listing takes about 3 minutes — just paste your REA or Domain URL and we''ll pull the details in automatically.\n\nIf you''d like a hand getting started, reply to this email and I''ll walk you through it.\n\nTeam ListHQ',
  'never_listed',
  'activation'
),
(
  'Re-engagement — At Risk',
  'We noticed you haven''t logged in recently',
  E'Hi {{name}},\n\nWe noticed you haven''t logged into ListHQ for a while.\n\nA lot has changed — we''ve added voice search in 24 languages, a full trust accounting suite, and an import tool so you can bring your REA and Domain listings across in seconds.\n\nLog in and take a look — it only takes a minute.\n\nTeam ListHQ',
  'at_risk',
  'retention'
),
(
  'Welcome to Paid Plan',
  'Welcome to ListHQ — you''re all set',
  E'Hi {{name}},\n\nThank you for upgrading your ListHQ account. You now have full access to everything on the platform.\n\nIf there''s anything you need help with, just reply to this email.\n\nTeam ListHQ',
  'paid',
  'general'
),
(
  'Platform Announcement',
  'New on ListHQ: [Feature Name]',
  E'Hi {{name}},\n\nWe''ve just launched [Feature Name] on ListHQ.\n\n[One sentence describing what it does and why it matters to agents.]\n\nLog in to try it now.\n\nTeam ListHQ',
  'all',
  'announcement'
);