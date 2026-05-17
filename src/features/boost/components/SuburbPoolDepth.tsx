import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Props {
  suburb: string;
  currentListingId: string;
}

interface PoolCounts {
  premier: number;
  featured: number;
}

const PREMIER_CAP = 3;
const FEATURED_CAP = 2;

export function SuburbPoolDepth({ suburb, currentListingId }: Props) {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb) return;
    setLoading(true);

    const now = new Date().toISOString();

    supabase
      .from('properties')
      .select('boost_tier')
      .ilike('suburb', `%${suburb}%`)
      .eq('is_featured', true)
      .eq('is_active', true)
      .gt('featured_until', now)
      .neq('id', currentListingId)
      .then(({ data }) => {
        const rows = data ?? [];
        setCounts({
          premier: rows.filter((r: { boost_tier: string | null }) => r.boost_tier === 'premier').length,
          featured: rows.filter((r: { boost_tier: string | null }) => r.boost_tier === 'featured').length,
        });
        setLoading(false);
      });
  }, [suburb, currentListingId]);

  if (loading) {
    return (
      


         Checking {suburb} availability…
      


    );
  }

  if (!counts) return null;

  const premierOpen = Math.max(0, PREMIER_CAP - counts.premier);
  const featuredOpen = Math.max(0, FEATURED_CAP - counts.featured);

  function slotLabel(active: number, cap: number, open: number) {
    if (active === 0) return { text: `${cap} slots available`, urgent: false };
    if (open === 0) return { text: `${active} active · rotates into pool`, urgent: true };
    return { text: `${active} active · ${open} slot${open !== 1 ? 's' : ''} available`, urgent: false };
  }

  const premierLabel = slotLabel(counts.premier, PREMIER_CAP, premierOpen);
  const featuredLabel = slotLabel(counts.featured, FEATURED_CAP, featuredOpen);

  return (
    


      

📊 {suburb} right now


      


        


          Premier (slots 1–3)
          
            {premierLabel.text}
          
        


        


          Featured (slots 4–5)
          
            {featuredLabel.text}
          
        


      


    


  );
}
