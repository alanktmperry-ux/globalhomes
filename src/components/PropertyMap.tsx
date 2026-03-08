import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Property } from '@/lib/types';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  selectedPropertyId?: string;
  onAreaSearch?: (bounds: { type: 'circle'; center: [number, number]; radius: number } | { type: 'polygon'; coordinates: [number, number][] }) => void;
}

export function PropertyMap({ properties, onPropertySelect, selectedPropertyId, onAreaSearch }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  const handleCreated = useCallback((e: any) => {
    const layer = e.layer;
    drawnItemsRef.current?.clearLayers();
    drawnItemsRef.current?.addLayer(layer);

    if (!onAreaSearch) return;

    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      onAreaSearch({
        type: 'circle',
        center: [center.lat, center.lng],
        radius: layer.getRadius(),
      });
    } else if (layer instanceof L.Polygon) {
      const coords = (layer.getLatLngs()[0] as L.LatLng[]).map(
        (ll) => [ll.lat, ll.lng] as [number, number]
      );
      onAreaSearch({ type: 'polygon', coordinates: coords });
    }
  }, [onAreaSearch]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-37.85, 145.35],
      zoom: 11,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
        circle: {
          shapeOptions: {
            color: 'hsl(217, 91%, 53%)',
            fillColor: 'hsl(217, 91%, 53%)',
            fillOpacity: 0.1,
            weight: 2,
          },
        },
        polygon: {
          shapeOptions: {
            color: 'hsl(217, 91%, 53%)',
            fillColor: 'hsl(217, 91%, 53%)',
            fillOpacity: 0.1,
            weight: 2,
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    const markers = L.layerGroup().addTo(map);
    markersRef.current = markers;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Attach draw event
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DELETED, () => {
      onAreaSearch?.(undefined as any);
    });

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DELETED);
    };
  }, [handleCreated, onAreaSearch]);

  // Update markers
  useEffect(() => {
    const markers = markersRef.current;
    const map = mapInstanceRef.current;
    if (!markers || !map) return;

    markers.clearLayers();

    const propsWithCoords = properties.filter((p) => p.lat && p.lng);
    if (propsWithCoords.length === 0) return;

    propsWithCoords.forEach((property) => {
      const isSelected = property.id === selectedPropertyId;
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: ${isSelected ? 'hsl(217, 91%, 53%)' : 'hsl(0, 0%, 100%)'};
          color: ${isSelected ? 'white' : 'hsl(220, 20%, 10%)'};
          border: 2px solid hsl(217, 91%, 53%);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transform: translate(-50%, -100%);
          cursor: pointer;
        ">${property.priceFormatted}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([property.lat!, property.lng!], { icon });
      marker.on('click', () => onPropertySelect(property));
      marker.addTo(markers);
    });

    const bounds = L.latLngBounds(propsWithCoords.map((p) => [p.lat!, p.lng!]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [properties, selectedPropertyId, onPropertySelect]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden border border-border" />
  );
}
