import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { autocomplete, geocode, loadGoogleMapsScript } from '@/lib/googleMapsService';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

interface Suggestion {
  description: string;
  place_id: string;
}

const StepAddress = ({ draft, update }: Props) => {
  const [query, setQuery] = useState(draft.address);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Load Google Maps script for map preview
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setMapReady(true))
      .catch(() => {});
  }, []);

  // Autocomplete with debounce
  useEffect(() => {
    if (manualMode || query.length < 3) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const results = await autocomplete(query);
      setSuggestions(results.slice(0, 5));
      setSearching(false);
      setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, manualMode]);

  const showOnMap = (lat: number, lng: number) => {
    if (!mapReady || !mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 16,
        mapId: 'pocket-listing-preview',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });
    } else {
      mapInstance.current.panTo({ lat, lng });
      mapInstance.current.setZoom(16);
    }

    if (markerRef.current) {
      markerRef.current.map = null;
    }

    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstance.current,
      position: { lat, lng },
    });
  };

  const selectSuggestion = async (suggestion: Suggestion) => {
    setQuery(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setMapLoading(true);

    // Parse suburb and state from the description
    const parts = suggestion.description.split(',').map(p => p.trim());
    const address = parts[0] || suggestion.description;
    let suburb = '';
    let state = '';

    if (parts.length >= 3) {
      suburb = parts[1];
      // State is often in the format "VIC 3000" or just "Victoria"
      const stateRaw = parts[2];
      state = stateRaw.split(' ')[0];
    } else if (parts.length === 2) {
      suburb = parts[1];
    }

    update({
      address: suggestion.description,
      suburb,
      state,
    });

    // Geocode for map
    const coords = await geocode(suggestion.description);
    if (coords) {
      showOnMap(coords.lat, coords.lng);
    }
    setMapLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold mb-2 block">Property Address</Label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (manualMode) {
                update({ address: e.target.value });
              }
            }}
            placeholder="Start typing an address..."
            className="pl-9 bg-secondary border-border"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && !manualMode && (
          <div className="mt-1 border border-border rounded-xl bg-card overflow-hidden shadow-elevated z-10 relative">
            {suggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3 text-sm"
              >
                <MapPin size={14} className="text-primary shrink-0" />
                <span className="truncate">{s.description}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-xs text-primary mt-2 hover:underline"
        >
          {manualMode ? 'Use address search' : "Can't find address? Type manually"}
        </button>
      </div>

      {/* Map preview */}
      {draft.address && (
        <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 200 }}>
          {mapLoading && (
            <div className="absolute inset-0 bg-secondary flex items-center justify-center z-10">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          )}
          {mapReady ? (
            <div ref={mapRef} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <div className="text-center">
                <MapPin size={24} className="mx-auto text-primary mb-2" />
                <p className="text-sm font-medium">{draft.address}</p>
                <p className="text-xs text-muted-foreground mt-1">Map preview</p>
              </div>
            </div>
          )}
        </div>
      )}

      {manualMode && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Suburb</Label>
            <Input
              value={draft.suburb}
              onChange={(e) => update({ suburb: e.target.value })}
              placeholder="South Yarra"
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input
              value={draft.state}
              onChange={(e) => update({ state: e.target.value })}
              placeholder="VIC"
              className="bg-secondary border-border"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StepAddress;
