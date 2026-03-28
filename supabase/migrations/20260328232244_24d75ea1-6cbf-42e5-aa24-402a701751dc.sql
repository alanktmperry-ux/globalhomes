-- Properties: most-queried table in the app
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON public.properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_suburb ON public.properties(suburb);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_active_agent ON public.properties(is_active, agent_id);

-- Agents: looked up by auth user on almost every authenticated page
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_agency_id ON public.agents(agency_id);

-- Leads: agent CRM core table
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON public.leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Saved properties: user bookmarks
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_id ON public.saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property_id ON public.saved_properties(property_id);

-- Notifications: per-agent inbox
CREATE INDEX IF NOT EXISTS idx_notifications_agent_id ON public.notifications(agent_id);

-- Lead events: analytics
CREATE INDEX IF NOT EXISTS idx_lead_events_agent_id ON public.lead_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_property_id ON public.lead_events(property_id);

-- CRM contacts
CREATE INDEX IF NOT EXISTS idx_contacts_agency_id ON public.contacts(agency_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

-- Property management
CREATE INDEX IF NOT EXISTS idx_tenancies_agent_id ON public.tenancies(agent_id);

-- Offers
CREATE INDEX IF NOT EXISTS idx_offers_agent_id ON public.offers(agent_id);
CREATE INDEX IF NOT EXISTS idx_offers_property_id ON public.offers(property_id);