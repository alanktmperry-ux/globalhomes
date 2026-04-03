import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLogPropertyView(propertyId: string | undefined) {
  const logged = useRef(false);

  useEffect(() => {
    if (!propertyId || logged.current) return;
    logged.current = true;

    let sessionId = sessionStorage.getItem('lhq_sid');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('lhq_sid', sessionId);
    }

    const source = (() => {
      const ref = document.referrer;
      if (ref.includes('/search') || ref.includes('/buy') || ref.includes('/rent')) return 'search';
      if (ref.includes('/suburb/')) return 'suburb';
      if (ref.includes('/agent/')) return 'agent_profile';
      if (ref.includes('/saved')) return 'saved_search';
      if (!ref || ref === '') return 'direct';
      return 'external';
    })();

    const device = (() => {
      const ua = navigator.userAgent;
      if (/Mobi|Android/i.test(ua)) return 'mobile';
      if (/iPad|Tablet/i.test(ua)) return 'tablet';
      return 'desktop';
    })();

    supabase.rpc('log_property_view', {
      p_property_id: propertyId,
      p_session_id: sessionId,
      p_source: source,
      p_device_type: device,
    });
  }, [propertyId]);
}
