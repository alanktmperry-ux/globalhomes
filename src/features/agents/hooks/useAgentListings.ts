import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Tables } from '@/integrations/supabase/types';

type Property = Tables<'properties'>;

interface ListingWithMeta extends Property {
  _source: 'db';
}

interface MockListing {
  id: string;
  title: string;
  address: string;
  suburb: string;
  state: string;
  country: string;
  price: number;
  price_formatted: string;
  beds: number;
  baths: number;
  parking: number;
  sqm: number;
  status: string;
  views: number;
  contact_clicks: number;
  image_url: string | null;
  images: string[] | null;
  description: string | null;
  property_type: string | null;
  features: string[] | null;
  is_active: boolean;
  listed_date: string | null;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
  estimated_value: string | null;
  _source: 'mock';
  _mock_status: string;
  _mock_leads: number;
  _mock_days: number;
}

const MOCK_LISTINGS: MockListing[] = [
  { id: 'mock-1', title: 'Modern Family Oasis', address: '42 Panorama Drive, Berwick', suburb: 'Berwick', state: 'VIC', country: 'Australia', price: 885000, price_formatted: '$850K – $920K', beds: 4, baths: 2, parking: 2, sqm: 280, status: 'whisper', views: 24, contact_clicks: 3, image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop', images: [], description: null, property_type: 'House', features: [], is_active: true, listed_date: null, created_at: '', updated_at: '', agent_id: null, estimated_value: null, _source: 'mock', _mock_status: 'whisper', _mock_leads: 3, _mock_days: 4 },
  { id: 'mock-2', title: 'Station Side Living', address: '15 Station St, Narre Warren', suburb: 'Narre Warren', state: 'VIC', country: 'Australia', price: 650000, price_formatted: '$620K – $680K', beds: 3, baths: 1, parking: 1, sqm: 180, status: 'coming-soon', views: 67, contact_clicks: 5, image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=150&fit=crop', images: [], description: null, property_type: 'Apartment', features: [], is_active: true, listed_date: null, created_at: '', updated_at: '', agent_id: null, estimated_value: null, _source: 'mock', _mock_status: 'coming-soon', _mock_leads: 5, _mock_days: 11 },
  { id: 'mock-3', title: 'Coastal Elegance', address: '8 Ocean View Rd, Brighton', suburb: 'Brighton', state: 'VIC', country: 'Australia', price: 1900000, price_formatted: '$1.8M – $2.0M', beds: 5, baths: 3, parking: 2, sqm: 450, status: 'public', views: 142, contact_clicks: 7, image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&h=150&fit=crop', images: [], description: null, property_type: 'House', features: [], is_active: true, listed_date: null, created_at: '', updated_at: '', agent_id: null, estimated_value: null, _source: 'mock', _mock_status: 'public', _mock_leads: 7, _mock_days: 18 },
  { id: 'mock-4', title: 'Investor Special', address: '22 Market St, CBD', suburb: 'CBD', state: 'VIC', country: 'Australia', price: 540000, price_formatted: '$540K', beds: 2, baths: 1, parking: 1, sqm: 95, status: 'sold', views: 89, contact_clicks: 12, image_url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=200&h=150&fit=crop', images: [], description: null, property_type: 'Apartment', features: [], is_active: false, listed_date: null, created_at: '', updated_at: '', agent_id: null, estimated_value: null, _source: 'mock', _mock_status: 'sold', _mock_leads: 12, _mock_days: 6 },
];

export type AgentListing = (ListingWithMeta | MockListing);

export function useAgentListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = () => setFetchKey(k => k + 1);

  useEffect(() => {
    if (!user) { setListings([]); setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!agent) {
        setListings([]);
        setLoading(false);
        return;
      }

      setAgentId(agent.id);

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false });

      const dbListings: ListingWithMeta[] = (props || []).map(p => ({ ...p, _source: 'db' as const }));

      setListings(dbListings);
      setLoading(false);
    };

    fetch();
  }, [user, fetchKey]);

  const realCount = listings.filter(l => '_source' in l && l._source === 'db').length;
  const isMockData = listings.length > 0 && listings.every(l => '_source' in l && l._source === 'mock');

  return { listings, loading, agentId, realCount, isMockData, refetch };
}
