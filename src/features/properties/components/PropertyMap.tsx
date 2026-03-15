/// <reference types="google.maps" />
import { useEffect, useRef, useCallback, useState } from 'react';
import { Property } from '@/lib/types';
import { loadGoogleMapsScript } from '@/lib/googleMapsService';
import { Loader2, Locate, Search, X, HelpCircle } from 'lucide-react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const TYPE_COLORS: Record<string, string> = {
  house: '#06b6d4',
  apartment: '#8b5cf6',
  townhouse: '#10b981',
  land: '#f97316',
  villa: '#06b6d4',
  unit: '#8b5cf6',
};

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
];

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  selectedPropertyId?: string;
  onAreaSearch?: (bounds: { type: 'circle'; center: [number, number]; radius: number } | { type: 'polygon'; coordinates: [number, number][] } | null) => void;
  centerOn?: { lat: number; lng: number; key?: number | string } | null;
  onMapMoved?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onScrollToProperty?: (propertyId: string) => void;
  formatPrice?: (audPrice: number, isRental?: boolean) => string;
}

export function PropertyMap({
  properties, onPropertySelect, selectedPropertyId, onAreaSearch, centerOn, onMapMoved, onScrollToProperty, formatPrice,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const drawnOverlayRef = useRef<google.maps.Circle | google.maps.Polygon | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hasDrawnArea, setHasDrawnArea] = useState(false);
  const userMovedRef = useRef(false);

  const clearDrawnOverlay = useCallback(() => {
    if (drawnOverlayRef.current) {
      drawnOverlayRef.current.setMap(null);
      drawnOverlayRef.current = null;
    }
    setHasDrawnArea(false);
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
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          styles: LIGHT_MAP_STYLE,
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
            fillColor: '#06b6d4',
            fillOpacity: 0.08,
            strokeColor: '#06b6d4',
            strokeWeight: 2,
            editable: true,
            draggable: true,
          },
          polygonOptions: {
            fillColor: '#06b6d4',
            fillOpacity: 0.08,
            strokeColor: '#06b6d4',
            strokeWeight: 2,
            editable: true,
            draggable: true,
          },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;
        mapInstanceRef.current = map;

        // Track user interaction for "Search this area"
        map.addListener('dragend', () => {
          userMovedRef.current = true;
          setShowSearchArea(true);
        });
        map.addListener('zoom_changed', () => {
          if (userMovedRef.current) setShowSearchArea(true);
        });

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load map');
          setIsLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Center map when location is selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !centerOn) return;
    userMovedRef.current = false;
    setShowSearchArea(false);
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
        setHasDrawnArea(true);
        const center = circle.getCenter()!;
        onAreaSearch({ type: 'circle', center: [center.lat(), center.lng()], radius: circle.getRadius() });

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
        setHasDrawnArea(true);
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

    return () => { google.maps.event.removeListener(listener); };
  }, [onAreaSearch, clearDrawnOverlay]);

  // Update markers with clustering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const propsWithCoords = properties.filter((p) => p.lat && p.lng);
    if (propsWithCoords.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    const markers = propsWithCoords.map((property) => {
      const isSelected = property.id === selectedPropertyId;
      const typeColor = TYPE_COLORS[property.propertyType?.toLowerCase() || 'house'] || '#06b6d4';

      const content = document.createElement('div');
      content.className = 'property-marker';
      const isRental = property.listingType === 'rent' || property.listingType === 'rental';
      const priceLabel = formatPrice ? formatPrice(property.price, isRental) : property.priceFormatted;
      content.innerHTML = `<div style="
        background: ${isSelected ? typeColor : '#ffffff'};
        color: ${isSelected ? 'white' : typeColor};
        border: 2px solid ${typeColor};
        border-radius: 8px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        cursor: pointer;
        transform: translateY(-100%);
        transition: all 0.2s ease;
        ${isSelected ? `box-shadow: 0 0 16px ${typeColor}60; transform: translateY(-100%) scale(1.15);` : ''}
      ">${priceLabel}</div>`;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: property.lat!, lng: property.lng! },
        content: content.firstElementChild as HTMLElement,
      });

      // Hover preview
      const markerEl = marker.element;
      if (markerEl) {
        markerEl.addEventListener('mouseenter', () => {
          infoWindow.setContent(`
            <div style="font-family: 'DM Sans', sans-serif; min-width: 200px; padding: 2px;">
              <img src="${property.imageUrl}" alt="" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" />
              <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${formatPrice ? formatPrice(property.price, isRental) : property.priceFormatted}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${property.title}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">🛏 ${property.beds} · 🛁 ${property.baths} · 🚗 ${property.parking}</div>
            </div>
          `);
          infoWindow.open(map, marker);
        });
        markerEl.addEventListener('mouseleave', () => {
          infoWindow.close();
        });
      }

      marker.addListener('click', () => {
        onPropertySelect(property);
        onScrollToProperty?.(property.id);
        // Bounce animation
        const el = marker.content as HTMLElement;
        if (el) {
          el.style.transition = 'transform 0.15s ease';
          el.style.transform = 'translateY(-100%) scale(1.2)';
          setTimeout(() => { el.style.transform = 'translateY(-100%) scale(1)'; }, 150);
          setTimeout(() => { el.style.transform = 'translateY(-100%) scale(1.1)'; }, 300);
          setTimeout(() => { el.style.transform = 'translateY(-100%) scale(1)'; }, 450);
        }
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: property.lat!, lng: property.lng! });
      return marker;
    });

    // Clustering
    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render: ({ count, position }) => {
          const el = document.createElement('div');
          el.innerHTML = `<div style="
            background: linear-gradient(135deg, #06b6d4, #8b5cf6);
            color: white;
            border-radius: 50%;
            width: ${36 + Math.min(count, 50)}px;
            height: ${36 + Math.min(count, 50)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            font-family: 'Plus Jakarta Sans', sans-serif;
            box-shadow: 0 2px 12px rgba(6, 182, 212, 0.4);
            border: 2px solid rgba(255,255,255,0.3);
          ">${count}</div>`;
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: el.firstElementChild as HTMLElement,
          });
        },
      },
    });

    if (!centerOn) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      const listener = google.maps.event.addListener(map, 'idle', () => {
        const zoom = map.getZoom();
        if (zoom && zoom > 14) map.setZoom(14);
        google.maps.event.removeListener(listener);
      });
    }
  }, [properties, selectedPropertyId, onPropertySelect, centerOn, onScrollToProperty, formatPrice]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapInstanceRef.current;
        if (map) {
          map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          map.setZoom(14);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSearchThisArea = () => {
    const map = mapInstanceRef.current;
    if (!map || !onMapMoved) return;
    const b = map.getBounds();
    if (b) {
      onMapMoved({
        north: b.getNorthEast().lat(),
        south: b.getSouthWest().lat(),
        east: b.getNorthEast().lng(),
        west: b.getSouthWest().lng(),
      });
    }
    setShowSearchArea(false);
    userMovedRef.current = false;
  };

  if (error) {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden border border-border flex items-center justify-center bg-secondary">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background gap-2">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="text-xs text-muted-foreground">Mapping properties…</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />

      {/* Search this area button */}
      {showSearchArea && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSearchThisArea}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-elevated text-sm font-medium text-foreground hover:bg-card transition-colors"
            >
              <Search size={14} className="text-primary" />
              Search this area
            </button>
          </TooltipTrigger>
          <TooltipContent>Search for properties visible in this map area</TooltipContent>
        </Tooltip>
      )}

      {/* Clear drawn area button */}
      {hasDrawnArea && onAreaSearch && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { clearDrawnOverlay(); onAreaSearch(null); }}
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-elevated text-xs font-medium text-foreground hover:bg-card transition-colors"
            >
              <X size={12} />
              Clear area
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove the drawn area filter and show all properties</TooltipContent>
        </Tooltip>
      )}

      {/* Drawing tools legend */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="absolute top-14 left-3 z-20 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-elevated flex items-center justify-center hover:bg-card transition-colors"
          >
            <HelpCircle size={14} className="text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          <p className="font-medium mb-1">Map drawing tools</p>
          <p className="text-xs">Use the icons above to draw a <strong>circle</strong> or <strong>polygon</strong> on the map to filter properties within that area. Click and drag to draw.</p>
        </TooltipContent>
      </Tooltip>

      {/* Geolocation button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleGeolocate}
            className="absolute bottom-4 left-4 z-20 w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-elevated flex items-center justify-center hover:bg-card transition-colors"
            aria-label="Find properties near me"
          >
            {locating ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : (
              <Locate size={16} className="text-foreground" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>Use your current location to find nearby properties</TooltipContent>
      </Tooltip>
    </div>
    </TooltipProvider>
  );
}
