import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { loadGoogleMapsScript, autocomplete, geocode } from '@/lib/googleMapsService';
import { supabase } from '@/integrations/supabase/client';

interface ServiceAreaMapPickerProps {
  serviceAreas: string[];
  onAreasChange: (areas: string[]) => void;
  maxAreas?: number;
}

interface MarkerInfo {
  name: string;
  lat: number;
  lng: number;
  marker?: google.maps.marker.AdvancedMarkerElement;
}

const ServiceAreaMapPicker = ({ serviceAreas, onAreasChange, maxAreas = 10 }: ServiceAreaMapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<MarkerInfo[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [searching, setSearching] = useState(false);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await loadGoogleMapsScript();
        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 }, // Australia center
          zoom: 4,
          mapId: 'service-area-picker',
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });

        // Click to add area
        map.addListener('click', async (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          await reverseGeocodeAndAdd(lat, lng, map);
        });

        mapInstance.current = map;
        setMapReady(true);
        setLoading(false);

        // Add existing service areas as markers
        for (const area of serviceAreas) {
          const coords = await geocode(area);
          if (coords && map) {
            addMarkerToMap(area, coords.lat, coords.lng, map);
          }
        }
      } catch (err) {
        console.error('Failed to load map:', err);
        setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const reverseGeocodeAndAdd = async (lat: number, lng: number, map: google.maps.Map) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: { action: 'reverse_geocode', input: { lat, lng } },
      });
      if (error || !data?.results?.length) return;

      // Extract suburb/locality name
      const result = data.results[0];
      let areaName = '';

      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          areaName = component.long_name;
          break;
        }
        if (component.types.includes('sublocality_level_1') || component.types.includes('neighborhood')) {
          areaName = component.long_name;
          break;
        }
        if (component.types.includes('administrative_area_level_2') && !areaName) {
          areaName = component.long_name;
        }
      }

      if (!areaName) {
        // Fallback: use first part of formatted address
        areaName = result.formatted_address.split(',')[0];
      }

      if (areaName && !serviceAreas.includes(areaName) && serviceAreas.length < maxAreas) {
        addMarkerToMap(areaName, lat, lng, map);
        onAreasChange([...serviceAreas, areaName]);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  const addMarkerToMap = (name: string, lat: number, lng: number, map: google.maps.Map) => {
    // Check if already exists
    if (markersRef.current.find(m => m.name === name)) return;

    const pinEl = document.createElement('div');
    pinEl.className = 'service-area-pin';
    pinEl.style.cssText = `
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      cursor: pointer;
    `;
    pinEl.textContent = name;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat, lng },
      content: pinEl,
      title: name,
    });

    markersRef.current.push({ name, lat, lng, marker });
  };

  const removeArea = (areaToRemove: string) => {
    const markerInfo = markersRef.current.find(m => m.name === areaToRemove);
    if (markerInfo?.marker) {
      markerInfo.marker.map = null;
    }
    markersRef.current = markersRef.current.filter(m => m.name !== areaToRemove);
    onAreasChange(serviceAreas.filter(a => a !== areaToRemove));
  };

  // Search autocomplete
  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      const results = await autocomplete(searchQuery);
      setSuggestions(results.slice(0, 5));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSelectSuggestion = async (description: string) => {
    setSearching(true);
    setSuggestions([]);
    setSearchQuery('');
    try {
      const coords = await geocode(description);
      if (coords && mapInstance.current) {
        // Extract locality from description
        const parts = description.split(',');
        const areaName = parts[0].trim();

        if (!serviceAreas.includes(areaName) && serviceAreas.length < maxAreas) {
          mapInstance.current.panTo(coords);
          mapInstance.current.setZoom(12);
          addMarkerToMap(areaName, coords.lat, coords.lng, mapInstance.current);
          onAreasChange([...serviceAreas, areaName]);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for a city or suburb..."
            className="pl-9"
          />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-elevated overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s.place_id}
                onClick={() => handleSelectSuggestion(s.description)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <MapPin size={13} className="text-muted-foreground shrink-0" />
                <span className="truncate">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 300 }}>
        {loading && (
          <div className="absolute inset-0 bg-secondary flex items-center justify-center z-10">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground">
          Click on the map to add a service area
        </div>
      </div>

      {/* Selected areas */}
      {serviceAreas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {serviceAreas.map(a => (
            <Badge key={a} className="bg-primary/10 text-primary border-primary/20 gap-1 pr-1.5">
              <MapPin size={10} />
              {a}
              <button
                onClick={() => removeArea(a)}
                className="ml-0.5 w-4 h-4 rounded-full hover:bg-destructive/20 flex items-center justify-center transition-colors"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {serviceAreas.length >= maxAreas && (
        <p className="text-xs text-muted-foreground">Maximum {maxAreas} service areas reached.</p>
      )}
    </div>
  );
};

export default ServiceAreaMapPicker;
