import { supabase } from '@/integrations/supabase/client';

// Browser-loadable Google Maps key. This MUST be a referrer-restricted public key
// (HTTP referrers limited to listhq.com.au, globalhomes.lovable.app, localhost).
// It is intentionally embedded in the client bundle — referrer restrictions on the
// Google Cloud key are what enforce security, not secrecy of the string itself.
// The unrestricted server key lives only in the google-maps-proxy edge function.
const BROWSER_MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ?? 'AIzaSyDdVqhomkwJ9pauaf70fw2CqJDB4M8zeUw';

export async function getGoogleMapsApiKey(): Promise<string> {
  if (!BROWSER_MAPS_KEY) {
    throw new Error('Google Maps browser key is not configured (VITE_GOOGLE_MAPS_BROWSER_KEY).');
  }
  return BROWSER_MAPS_KEY;
}

export async function autocomplete(input: string, types?: string): Promise<{ description: string; place_id: string }[]> {
  if (!input || input.length < 2) return [];
  const body: Record<string, string> = { action: 'autocomplete', input };
  if (types) body.input_types = types;
  const { data, error } = await supabase.functions.invoke('google-maps-proxy', { body });
  if (error || !data?.predictions) return [];
  return data.predictions.map((p: any) => ({
    description: p.description,
    place_id: p.place_id,
  }));
}

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
    body: { action: 'geocode', input: address },
  });
  if (error || !data?.results?.[0]) return null;
  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

export async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
    body: { action: 'place_details', input: placeId },
  });
  if (error || !data?.result) return null;
  const loc = data.result.geometry.location;
  return { lat: loc.lat, lng: loc.lng, address: data.result.formatted_address };
}

let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  if (loadPromise) return loadPromise;
  if ((window as any).google?.maps) return Promise.resolve();

  loadPromise = getGoogleMapsApiKey().then((key) => {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=drawing,places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load Google Maps script'));
      };
      document.head.appendChild(script);
    });
  });
  return loadPromise;
}

export function resetMapsLoader(): void {
  loadPromise = null;
}
