/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMapsScript } from '@/shared/lib/googleMapsService';

export interface AddressParts {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  lat?: number;
  lng?: number;
}

interface Props {
  value: string;
  onChange: (raw: string) => void;
  onSelect: (parts: AddressParts) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/** Try to extract suburb from a formatted address string like "10 High St, Berwick VIC 3806" */
function parseSuburbFromAddress(formatted: string): string {
  // Split by comma, take the second-last segment which usually contains "Suburb STATE POSTCODE"
  const segments = formatted.split(',').map(s => s.trim());
  for (let i = segments.length - 1; i >= 0; i--) {
    // Match pattern: "Suburb VIC 3000" or just "Suburb VIC"
    const match = segments[i].match(/^([A-Za-z\s'-]+?)\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/i);
    if (match) return match[1].trim();
  }
  // Fallback: second segment often is just the suburb name
  if (segments.length >= 2) {
    const candidate = segments[segments.length - 2].replace(/\d+/g, '').trim();
    if (candidate.length >= 3 && candidate.length <= 40) return candidate;
  }
  return '';
}

function parseStateFromAddress(formatted: string): string {
  const match = formatted.match(/\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/i);
  return match ? match[1].toUpperCase() : '';
}

function parseComponents(components: google.maps.GeocoderAddressComponent[], formattedAddress?: string): Omit<AddressParts, 'address'> {
  const get = (type: string, short = false) => {
    const c = components.find(c => c.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : '';
  };
  let suburb = get('locality') || get('sublocality_level_1') || get('sublocality');
  let state = get('administrative_area_level_1', true);

  // Fallback: parse from formatted address if geocoder didn't return locality
  if (!suburb && formattedAddress) {
    suburb = parseSuburbFromAddress(formattedAddress);
  }
  if (!state && formattedAddress) {
    state = parseStateFromAddress(formattedAddress);
  }

  return {
    suburb,
    state,
    postcode: get('postal_code'),
  };
}

export function AddressAutocomplete({
  value, onChange, onSelect, placeholder, className, id, disabled
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        if (acRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'au' },
          types: ['address'],
          fields: ['place_id', 'address_components', 'formatted_address', 'geometry'],
        });

        const placesService = new google.maps.places.PlacesService(
          document.createElement('div')
        );

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.place_id || !place.address_components) return;

          // Use PlacesService.getDetails with the place_id for exact coordinates
          placesService.getDetails(
            { placeId: place.place_id, fields: ['geometry', 'address_components', 'formatted_address'] },
            (detail, status) => {
              const src = (status === google.maps.places.PlacesServiceStatus.OK && detail)
                ? detail
                : place;

              const components = src.address_components || place.address_components!;
              const formatted = src.formatted_address || place.formatted_address || '';
              const { suburb, state, postcode } = parseComponents(components, formatted);

              const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name ?? '';
              const route = components.find(c => c.types.includes('route'))?.long_name ?? '';
              const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

              onChange(streetAddress || src.formatted_address || '');
              onSelect({
                address: streetAddress || src.formatted_address || '',
                suburb,
                state,
                postcode,
                lat: src.geometry?.location?.lat(),
                lng: src.geometry?.location?.lng(),
              });
            }
          );
        });

        acRef.current = ac;
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFallback(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
    >
      {!fallback && (
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      )}
      {loading && !fallback && (
        <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground pointer-events-none z-10" />
      )}
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseDown={(e) => {
          // Ensure the native input receives focus even if Google's
          // Autocomplete widget intercepts pointer events
          e.currentTarget.focus();
        }}
        placeholder={placeholder ?? 'Start typing an address…'}
        className={`${!fallback ? 'pl-8' : ''} ${className ?? ''} relative z-0`}
        autoComplete="off"
        disabled={disabled}
      />
    </div>
  );
}
