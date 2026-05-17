import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getSessionId(): string {
  const KEY = 'lhq_boost_session';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

interface EventPayload {
  listing_id: string;
  event_type: 'impression' | 'click';
  source: 'premier' | 'featured';
  slot_position: number;
  suburb: string;
}

export function useBoostAnalytics() {
  const sessionId = useRef(getSessionId());

  const record = useCallback(async (payload: EventPayload) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from('listing_events').insert({
      ...payload,
      session_id: sessionId.current,
    }).then(() => {});
  }, []);

  const recordImpression = useCallback((
    listingId: string,
    source: 'premier' | 'featured',
    slotPosition: number,
    suburb: string,
  ) => {
    record({ listing_id: listingId, event_type: 'impression', source, slot_position: slotPosition, suburb });
  }, [record]);

  const recordClick = useCallback((
    listingId: string,
    source: 'premier' | 'featured',
    slotPosition: number,
    suburb: string,
  ) => {
    record({ listing_id: listingId, event_type: 'click', source, slot_position: slotPosition, suburb });
  }, [record]);

  return { recordImpression, recordClick };
}
