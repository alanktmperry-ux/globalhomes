import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadGoogleMapsScript } from '@/shared/lib/googleMapsService';

interface Props {
  lat: number;
  lng: number;
  address?: string;
  /** Tailwind height class — defaults to a height proportional to the hero image */
  heightClass?: string;
}

/**
 * Lightweight single-pin map for the property detail page.
 * Loads Google Maps lazily and renders a single AdvancedMarker at the property location.
 */
export function PropertyLocationMap({ lat, lng, address, heightClass = 'h-[280px] md:h-[340px]' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMapsScript();
        if (cancelled || !mapRef.current) return;
        const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
        await google.maps.importLibrary('marker');

        mapInstance.current = new Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
          mapId: 'property-detail-location',
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
        });

        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: { lat, lng },
          title: address ?? '',
        });

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Map failed to load');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (markerRef.current) markerRef.current.map = null;
    };
  }, [lat, lng, address]);

  // Pan if coords change after mount
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.panTo({ lat, lng });
      if (markerRef.current) markerRef.current.position = { lat, lng };
    }
  }, [lat, lng]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-border bg-secondary`}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-secondary/60">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
          <MapPin size={22} className="text-primary" />
          <p className="text-sm font-medium text-foreground">{address}</p>
          <p className="text-xs text-muted-foreground">Map unavailable</p>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-full" />
      )}
    </div>
  );
}
