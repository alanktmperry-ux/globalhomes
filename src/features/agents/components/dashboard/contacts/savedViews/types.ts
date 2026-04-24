export type ContactSortKey = 'next_action_due_at' | 'last_contacted_at' | 'name';
export type ContactSortDir = 'asc' | 'desc';

export type ContactColumnKey =
  | 'contact'
  | 'type'
  | 'ranking'
  | 'last_contacted'
  | 'next_action'
  | 'location'
  | 'contact_info'
  | 'actions';

export const DEFAULT_COLUMNS: ContactColumnKey[] = [
  'contact',
  'type',
  'ranking',
  'last_contacted',
  'next_action',
  'location',
  'contact_info',
  'actions',
];

export interface ContactFilters {
  search: string;
  type: string[];           // contact_type values
  ranking: string[];        // hot|warm|cold
  tags: { mode: 'AND' | 'OR'; ids: string[] };
  source: string[];
  has_next_action: boolean | null;     // null = any
  next_action_overdue: boolean | null; // null = any
  // Stubs for later batches — kept in schema so old views keep working:
  language?: string[];
  agent_id?: string[];
  custom_field_filters?: { field_id: string; operator: string; value: unknown }[];
}

export const EMPTY_FILTERS: ContactFilters = {
  search: '',
  type: [],
  ranking: [],
  tags: { mode: 'AND', ids: [] },
  source: [],
  has_next_action: null,
  next_action_overdue: null,
};

export interface ContactSort {
  key: ContactSortKey;
  dir: ContactSortDir;
}

export const DEFAULT_SORT: ContactSort = { key: 'next_action_due_at', dir: 'asc' };

export interface ContactSavedView {
  id: string;
  owner_id: string;
  agency_id: string;
  name: string;
  filters: ContactFilters;
  sort: ContactSort;
  columns: ContactColumnKey[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export const ALL_CONTACTS_VIEW_ID = '__all__';

export function filtersEqual(a: ContactFilters, b: ContactFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function sortEqual(a: ContactSort, b: ContactSort): boolean {
  return a.key === b.key && a.dir === b.dir;
}
