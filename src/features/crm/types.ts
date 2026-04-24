export type LeadStage =
  | 'new' | 'contacted' | 'qualified'
  | 'offer_stage' | 'under_contract' | 'settled' | 'lost';

export type LeadPriority = 'low' | 'medium' | 'high';
export type LeadTemperature = 'hot' | 'warm' | 'cold';

export type LeadSource =
  | 'manual' | 'enquiry_form' | 'open_home'
  | 'eoi' | 'pre_approval' | 'referral' | 'portal';

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task';

/**
 * A CRMLead now references a Contact (the source of truth for the person)
 * and only stores lead-specific metadata + pipeline state.
 */
export interface CRMLead {
  id: string;
  contact_id: string;
  agent_id: string;

  // Lead-specific metadata
  source_property_id?: string | null;
  enquiry_source: LeadSource;
  lead_temperature: LeadTemperature;
  first_seen_at: string;

  // Pipeline state
  stage: LeadStage;
  priority: LeadPriority;
  notes?: string | null;
  tags: string[];
  lost_reason?: string | null;
  expected_close?: string | null;
  last_contacted?: string | null;

  created_at: string;
  updated_at: string;

  // Joined data (populated by useCRMLeads)
  contact?: {
    first_name: string;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  property?: {
    address: string;
    suburb: string;
    state: string;
    primary_image_url?: string;
  };
  activity_count?: number;
  open_tasks?: number;
}

export interface CRMActivity {
  id: string;
  lead_id: string;
  agent_id: string;
  type: ActivityType;
  subject?: string;
  body: string;
  completed: boolean;
  due_at?: string;
  created_at: string;
}

export interface CRMTask {
  id: string;
  lead_id: string;
  agent_id: string;
  title: string;
  due_at: string;
  completed: boolean;
  created_at: string;
  lead?: {
    contact?: { first_name: string; last_name?: string | null };
    property?: { address: string };
  };
}

export interface PipelineSummary {
  stage: LeadStage;
  lead_count: number;
  hot_count: number;
  overdue_count: number;
  pipeline_value?: number;
}
