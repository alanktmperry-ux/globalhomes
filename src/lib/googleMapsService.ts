import { supabase } from '@/integrations/supabase/client';

let cachedApiKey: string | null = null;

const STORAGE_KEY = 'gmaps_api_key';
const STORAGE_EXPIRY_KEY = 'gmaps_api_key_exp';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export async function getGoogleMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  // Check localStorage cache
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (stored && expiry && Date.now() < Number(expiry)) {
      cachedApiKey = stored;
      return stored;
    }
  } catch {}

  const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
    body: { action: 'get_key' },
  });
  if (error || !data?.key) throw new Error('Failed to get Google Maps API key');
  cachedApiKey = data.key;

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, data.key);
    localStorage.setItem(STORAGE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
  } catch {}

  return data.key;
}

export async function autocomplete(input: string): Promise<{ description: string; place_id: string }[]> {
  if (!input || input.length < 2) return [];
  const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
    body: { action: 'autocomplete', input },
  });
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
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  });
  return loadPromise;
}
