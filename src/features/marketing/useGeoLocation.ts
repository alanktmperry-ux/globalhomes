import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeoLocation {
  city: string;
  state: string;
  country: string;
  display: string; // "City, STATE"
  loading: boolean;
}

const DEFAULT_LOCATION: GeoLocation = {
  city: "Melbourne",
  state: "VIC",
  country: "AU",
  display: "Melbourne, VIC",
  loading: true,
};

const CACHE_KEY = "gh-geo-v2";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Resolves visitor city/state via the `get-geo` edge function.
 * Caches result in localStorage for 30 minutes.
 */
export function useGeoLocation(): GeoLocation {
  const [location, setLocation] = useState<GeoLocation>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCATION;
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: GeoLocation };
        if (Date.now() - parsed.at < CACHE_TTL_MS && parsed.data?.city) {
          return { ...parsed.data, loading: false };
        }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_LOCATION;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-geo", {
          method: "GET",
        });
        if (cancelled || error || !data?.city) {
          if (!cancelled) setLocation((l) => ({ ...l, loading: false }));
          return;
        }
        const next: GeoLocation = {
          city: data.city,
          state: data.region || data.state || "",
          country: data.country || "AU",
          display: data.display || `${data.city}, ${data.region || ""}`.trim(),
          loading: false,
        };
        setLocation(next);
        try {
          window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ at: Date.now(), data: next })
          );
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) setLocation((l) => ({ ...l, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
