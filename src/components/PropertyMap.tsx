/// <reference types="google.maps" />
import { useEffect, useRef, useCallback, useState } from 'react';
import { Property } from '@/lib/types';
import { loadGoogleMapsScript } from '@/lib/googleMapsService';
import { Loader2 } from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  selectedPropertyId?: string;
  onAreaSearch?: (bounds: { type: 'circle'; center: [number, number]; radius: number } | { type: 'polygon'; coordinates: [number, number][] }) => void;
  centerOn?: { lat: number; lng: number } | null;
}

export function PropertyMap({ properties, onPropertySelect, selectedPropertyId, onAreaSearch, centerOn }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const drawnOverlayRef = useRef<google.maps.Circle | google.maps.Polygon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearDrawnOverlay = useCallback(() => {
    if (drawnOverlayRef.current) {
      drawnOverlayRef.current.setMap(null);
      drawnOverlayRef.current = null;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapRef.current) return;
      try {
        await loadGoogleMapsScript();
        if (cancelled || !mapRef.current) return;

        const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
        await google.maps.importLibrary('drawing');
        await google.maps.importLibrary('marker');

        const map = new Map(mapRef.current, {
          center: { lat: -37.85, lng: 145.35 },
          zoom: 11,
          mapId: 'property-map',
          disableDefaultUI: false,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
        });

        const drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT,
            drawingModes: [
              google.maps.drawing.OverlayType.CIRCLE,
              google.maps.drawing.OverlayType.POLYGON,
            ],
          },
          circleOptions: {
            fillColor: 'hsl(217, 91%, 53%)',
            fillOpacity: 0.1,
            strokeColor: 'hsl(217, 91%, 53%)',
            strokeWeight: 2,
            editable: true,
            draggable: true,
          },
          polygonOptions: {
            fillColor: 'hsl(217, 91%, 53%)',
            fillOpacity: 0.1,
            strokeColor: 'hsl(217, 91%, 53%)',
            strokeWeight: 2,
            editable: true,
            draggable: true,
          },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;
        mapInstanceRef.current = map;
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load map');
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Center map when location is selected from search
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !centerOn) return;
    map.panTo({ lat: centerOn.lat, lng: centerOn.lng });
    map.setZoom(15);
  }, [centerOn]);

  // Drawing events
  useEffect(() => {
    const dm = drawingManagerRef.current;
    if (!dm || !onAreaSearch) return;

    const listener = google.maps.event.addListener(dm, 'overlaycomplete', (e: google.maps.drawing.OverlayCompleteEvent) => {
      clearDrawnOverlay();
      dm.setDrawingMode(null);

      if (e.type === google.maps.drawing.OverlayType.CIRCLE) {
        const circle = e.overlay as google.maps.Circle;
        drawnOverlayRef.current = circle;
        const center = circle.getCenter()!;
        onAreaSearch({
          type: 'circle',
          center: [center.lat(), center.lng()],
          radius: circle.getRadius(),
        });

        google.maps.event.addListener(circle, 'radius_changed', () => {
          const c = circle.getCenter()!;
          onAreaSearch({ type: 'circle', center: [c.lat(), c.lng()], radius: circle.getRadius() });
        });
        google.maps.event.addListener(circle, 'center_changed', () => {
          const c = circle.getCenter()!;
          onAreaSearch({ type: 'circle', center: [c.lat(), c.lng()], radius: circle.getRadius() });
        });
      } else if (e.type === google.maps.drawing.OverlayType.POLYGON) {
        const polygon = e.overlay as google.maps.Polygon;
        drawnOverlayRef.current = polygon;
        const path = polygon.getPath();
        const coords = path.getArray().map((ll) => [ll.lat(), ll.lng()] as [number, number]);
        onAreaSearch({ type: 'polygon', coordinates: coords });

        google.maps.event.addListener(path, 'set_at', () => {
          const c = polygon.getPath().getArray().map((ll) => [ll.lat(), ll.lng()] as [number, number]);
          onAreaSearch({ type: 'polygon', coordinates: c });
        });
        google.maps.event.addListener(path, 'insert_at', () => {
          const c = polygon.getPath().getArray().map((ll) => [ll.lat(), ll.lng()] as [number, number]);
          onAreaSearch({ type: 'polygon', coordinates: c });
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [onAreaSearch, clearDrawnOverlay]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const propsWithCoords = properties.filter((p) => p.lat && p.lng);
    if (propsWithCoords.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    propsWithCoords.forEach((property) => {
      const isSelected = property.id === selectedPropertyId;
      
      const content = document.createElement('div');
      content.innerHTML = `<div style="
        background: ${isSelected ? 'hsl(217, 91%, 53%)' : 'white'};
        color: ${isSelected ? 'white' : 'hsl(220, 20%, 10%)'};
        border: 2px solid hsl(217, 91%, 53%);
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        cursor: pointer;
        transform: translateY(-100%);
      ">${property.priceFormatted}</div>`;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: property.lat!, lng: property.lng! },
        content: content.firstElementChild as HTMLElement,
      });

      marker.addListener('click', () => onPropertySelect(property));
      markersRef.current.push(marker);

      bounds.extend({ lat: property.lat!, lng: property.lng! });
    });

    if (!centerOn) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      
      const listener = google.maps.event.addListener(map, 'idle', () => {
        const zoom = map.getZoom();
        if (zoom && zoom > 14) map.setZoom(14);
        google.maps.event.removeListener(listener);
      });
    }
  }, [properties, selectedPropertyId, onPropertySelect]);

  if (error) {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden border border-border flex items-center justify-center bg-secondary">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-secondary">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
