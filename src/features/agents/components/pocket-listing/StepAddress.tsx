import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import type { AddressParts } from '@/components/ui/AddressAutocomplete';
import { loadGoogleMapsScript } from '@/shared/lib/googleMapsService';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const StepAddress = ({ draft, update }: Props) => {
  const [manualMode, setManualMode] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setMapReady(true))
      .catch((err) => console.error('[StepAddress] Google Maps load failed:', err));
  }, []);

  const showOnMap = useCallback(async (lat: number, lng: number) => {
    if (!mapReady || !mapRef.current) return;

    try {
      await google.maps.importLibrary('maps');
      await google.maps.importLibrary('marker');

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
    } catch (err) {
      console.error('Map render error:', err);
    }
  }, [mapReady]);

  useEffect(() => {
    if (mapReady && draft.lat && draft.lng) {
      showOnMap(draft.lat, draft.lng);
    }
  }, [mapReady, draft.lat, draft.lng, showOnMap]);

  const handleAddressSelect = useCallback((parts: AddressParts) => {
    setMapLoading(true);
    update({
      address: parts.address,
      suburb: parts.suburb || draft.suburb,
      state: parts.state || draft.state,
    });

    if (parts.lat && parts.lng) {
      showOnMap(parts.lat, parts.lng);
      update({ lat: parts.lat, lng: parts.lng });
    }
    setMapLoading(false);
  }, [update, showOnMap, draft.suburb, draft.state]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold mb-2 block">Property Address</Label>
        {manualMode ? (
          <Input
            value={draft.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Type full address manually"
            className="bg-secondary border-border"
          />
        ) : (
          <AddressAutocomplete
            value={draft.address}
            onChange={(raw) => update({ address: raw })}
            onSelect={handleAddressSelect}
            placeholder="Start typing an address..."
            className="bg-secondary border-border"
          />
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
