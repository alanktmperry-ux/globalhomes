import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ListingForMatching {
  id: string;
  agent_id: string;
  suburb: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  listing_type?: string;
  title?: string;
  address?: string;
}

export interface MatchedBuyer {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  ranking: string;
  preferred_suburbs: string[];
  budget_min: number | null;
  budget_max: number | null;
  preferred_beds: number | null;
  preferred_baths: number | null;
}

function suburbMatch(
  preferred: string[],
  listingSuburb: string
): boolean {
  if (!preferred || preferred.length === 0) return false;
  const norm = listingSuburb.toLowerCase().trim();
  return preferred.some(s => s.toLowerCase().trim() === norm);
}

function budgetMatch(
  budget_min: number | null,
  budget_max: number | null,
  price: number
): boolean {
  if (!budget_min && !budget_max) return true;
  if (budget_min && price < budget_min) return false;
  if (budget_max && price > budget_max) return false;
  return true;
}

function bedsMatch(preferred: number | null, listing: number): boolean {
  if (!preferred) return true;
  return listing >= preferred;
}

function bathsMatch(preferred: number | null, listing: number): boolean {
  if (!preferred) return true;
  return listing >= preferred;
}

export function useBuyerMatching() {
  const matchBuyersToListing = useCallback(async (
    property: ListingForMatching
  ): Promise<MatchedBuyer[]> => {
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(
          'id, first_name, last_name, email, phone, ranking, preferred_suburbs, budget_min, budget_max, preferred_beds, preferred_baths'
        )
        .eq('created_by', property.agent_id)
        .in('contact_type', ['buyer', 'both'])
        .not('preferred_suburbs', 'eq', '{}');

      if (error || !contacts) return [];

      const matched: MatchedBuyer[] = contacts.filter((c: any) => {
        if (!suburbMatch(c.preferred_suburbs || [], property.suburb)) return false;
        if (!budgetMatch(c.budget_min, c.budget_max, property.price)) return false;
        if (!bedsMatch(c.preferred_beds, property.beds)) return false;
        if (!bathsMatch(c.preferred_baths, property.baths)) return false;
        return true;
      });

      if (matched.length === 0) return [];

      const names = matched
        .slice(0, 3)
        .map(c => [c.first_name, c.last_name].filter(Boolean).join(' '))
        .join(', ');
      const extra = matched.length > 3 ? ` +${matched.length - 3} more` : '';

      const propertyLabel = property.title || `${property.beds}bd/${property.baths}ba in ${property.suburb}`;

      await dispatchNotification({
        agent_id: property.agent_id,
        event_key: 'buyer_match',
        title: `${matched.length} buyer${matched.length > 1 ? 's' : ''} matched — ${property.suburb}`,
        message: `${propertyLabel} matches ${names}${extra}. Go to Contacts → Pipeline to follow up.`,
      });

      return matched;
    } catch (err) {
      console.error('[useBuyerMatching]', err);
      return [];
    }
  }, []);

  return { matchBuyersToListing };
}
