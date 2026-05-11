import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeoLocation {
  suburb: string;
  state: string;
  region: string;
  display: string; // region label, e.g. "Melbourne East"
}

const DEFAULT_LOCATION: GeoLocation = {
  suburb: "Doncaster",
  state: "VIC",
  region: "Melbourne East",
  display: "Melbourne East",
};

const CACHE_KEY = "gh-geo-v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

/**
 * Resolve the visitor's region for the homepage Featured section.
 * 1. Reads cached geo from localStorage (6 hr TTL).
 * 2. Falls back to `window.__GEO__` (set by an edge proxy if present).
 * 3. Calls the `geo-locate` edge function, which reads Cloudflare/Vercel
 *    headers server-side and matches against `suburb_region_map`.
 * 4. Always returns a sane default so the UI never appears blank.
 */
export function useGeoLocation(): GeoLocation {
  const [location, setLocation] = useState<GeoLocation>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCATION;
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; data: GeoLocation };
        if (Date.now() - parsed.at < CACHE_TTL_MS && parsed.data?.region) {
          return parsed.data;
        }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_LOCATION;
  });

  useEffect(() => {
    let cancelled = false;

    // Sync read: window.__GEO__ may be injected by the edge proxy
    if (typeof window !== "undefined") {
      const injected = (window as any).__GEO__;
      if (injected && injected.region) {
        setLocation({
          suburb: injected.suburb || injected.city || DEFAULT_LOCATION.suburb,
          state: injected.state || injected.region_code || DEFAULT_LOCATION.state,
          region: injected.region,
          display: injected.region,
        });
      }
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("geo-locate", {
          method: "GET",
        });
        if (cancelled || error || !data?.region) return;
        const next: GeoLocation = {
          suburb: data.suburb || DEFAULT_LOCATION.suburb,
          state: data.state || DEFAULT_LOCATION.state,
          region: data.region,
          display: data.region,
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
        /* keep default */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
