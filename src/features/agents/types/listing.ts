import type { Database } from '@/integrations/supabase/types';

/** A row from the `properties` table, used as the `listing` prop in dashboard tabs. */
export type PropertyRow = Database['public']['Tables']['properties']['Row'];
