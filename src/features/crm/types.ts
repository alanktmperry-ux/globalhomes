export type LeadStage =
  | 'new' | 'contacted' | 'qualified'
  | 'offer_stage' | 'under_contract' | 'settled' | 'lost';

export type LeadPriority = 'low' | 'medium' | 'high';

export type LeadSource =
  | 'manual' | 'enquiry_form' | 'open_home'
  | 'eoi' | 'pre_approval' | 'referral' | 'portal';

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task';

export interface CRMLead {
  id: string;
  agent_id: string;
  property_id?: string;
  buyer_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  stage: LeadStage;
  priority: LeadPriority;
  source: LeadSource;
  budget_min?: number;
  budget_max?: number;
  pre_approved: boolean;
  pre_approval_amount?: number;
  notes?: string;
  tags: string[];
  lost_reason?: string;
  expected_close?: string;
  last_contacted?: string;
  created_at: string;
  updated_at: string;
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
    first_name: string;
    last_name?: string;
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
