export type DocumentAccessLevel = 'public' | 'registered_buyers' | 'agent_only' | 'parties_only';
export type DocumentRequestStatus = 'pending' | 'uploaded' | 'declined' | 'cancelled';
export type UploaderRole = 'agent' | 'vendor' | 'buyer' | 'tenant' | 'pm';

export interface DocumentCategory {
  id: string;
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  visible_to: string[];
  requires_nda: boolean;
  sort_order: number;
}

export interface PropertyDocument {
  id: string;
  property_id: string;
  category_slug: string;
  uploaded_by: string;
  uploader_role: UploaderRole;
  file_name: string;
  file_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  label?: string;
  description?: string;
  version: number;
  is_current: boolean;
  access_level: DocumentAccessLevel;
  visible_to_roles: string[];
  expires_at?: string;
  signed: boolean;
  signed_at?: string;
  download_count: number;
  created_at: string;
  updated_at: string;
  // joined
  document_categories?: DocumentCategory;
  uploader_name?: string;
}

export interface DocumentRequest {
  id: string;
  property_id: string;
  requested_by: string;
  requested_from?: string;
  requested_email?: string;
  category_slug?: string;
  custom_label?: string;
  message?: string;
  due_date?: string;
  status: DocumentRequestStatus;
  fulfilled_by_doc_id?: string;
  created_at: string;
  fulfilled_at?: string;
  // joined
  document_categories?: DocumentCategory;
  requester_name?: string;
}

export interface DocumentDownload {
  id: string;
  document_id: string;
  downloaded_by?: string;
  downloaded_at: string;
}

export interface UploadDocumentInput {
  propertyId: string;
  categorySlug: string;
  file: File;
  label?: string;
  description?: string;
  accessLevel: DocumentAccessLevel;
  visibleToRoles: string[];
  expiresAt?: string;
}
