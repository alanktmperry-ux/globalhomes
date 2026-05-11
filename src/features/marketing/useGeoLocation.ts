import { useEffect, useState } from "react";

export interface GeoLocation {
  suburb: string;
  state: string;
  display: string; // "Doncaster, VIC"
}

const DEFAULT_LOCATION: GeoLocation = {
  suburb: "Melbourne",
  state: "VIC",
  display: "Melbourne, VIC",
};

/**
 * Placeholder geo-location hook.
 * Phase 1: reads window.__GEO__ injected by Cloudflare Worker (city + region headers).
 * Phase 2 (later): client-side fetch from /api/geo edge function.
 * Phase 3 (later): user-overridable suburb via dropdown.
 */
export function useGeoLocation(): GeoLocation {
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const geo = (window as any).__GEO__;
    if (geo && geo.city && geo.region) {
      setLocation({
        suburb: geo.city,
        state: geo.region,
        display: `${geo.city}, ${geo.region}`,
      });
    }
  }, []);

  return location;
}
