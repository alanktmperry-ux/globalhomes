import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicAgentProfile {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  email?: string;
  years_experience?: number;
  specialties?: string[];
  service_areas?: string[];
  languages?: string[];
  linkedin_url?: string;
  instagram_url?: string;
  profile_banner_url?: string;
  profile_views: number;
  is_public_profile: boolean;
  rating?: number;
  review_count?: number;
  agency?: {
    id: string;
    name: string;
    logo_url?: string;
    slug?: string;
    verified?: boolean;
  };
  active_listings_count?: number;
  sold_count?: number;
}

export function useAgentProfile(slug: string) {
  const [agent, setAgent]     = useState<PublicAgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('agents')
        .select(`
          id, slug, name, avatar_url, headline, bio, phone, email,
          years_experience, service_areas, languages_spoken,
          linkedin_url, instagram_url, profile_banner_url,
          profile_views, is_public_profile, rating, review_count,
          specialization,
          agencies ( id, name, logo_url, slug, verified )
        `)
        .eq('slug', slug)
        .eq('is_public_profile', true)
        .maybeSingle();

      if (fetchErr || !data) {
        if (!cancelled) { setError('Agent not found'); setLoading(false); }
        return;
      }

      // Count active listings and sold properties
      const [{ count: activeCount }, { count: soldCount }] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', data.id)
          .eq('is_active', true),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', data.id)
          .eq('status', 'sold'),
      ]);

      // Increment profile views (fire-and-forget)
      supabase.rpc('increment_agent_profile_views', { p_agent_id: data.id });

      if (!cancelled) {
        const agencyRaw = data.agencies;
        setAgent({
          ...data,
          languages: data.languages_spoken ?? [],
          specialties: data.specialization
            ? data.specialization.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          agency: Array.isArray(agencyRaw) ? agencyRaw[0] : (agencyRaw ?? undefined),
          active_listings_count: activeCount ?? 0,
          sold_count: soldCount ?? 0,
        } as unknown as PublicAgentProfile);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug]);

  return { agent, loading, error };
}
