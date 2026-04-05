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

function parseComponents(components: google.maps.GeocoderAddressComponent[]): Omit<AddressParts, 'address'> {
  const get = (type: string, short = false) => {
    const c = components.find(c => c.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : '';
  };
  return {
    suburb: get('locality') || get('sublocality_level_1') || get('sublocality'),
    state: get('administrative_area_level_1', true),
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
          fields: ['address_components', 'formatted_address', 'geometry'],
        });

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.address_components) return;

          const { suburb, state, postcode } = parseComponents(place.address_components);

          const streetNumber = place.address_components.find(c => c.types.includes('street_number'))?.long_name ?? '';
          const route = place.address_components.find(c => c.types.includes('route'))?.long_name ?? '';
          const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

          onChange(streetAddress || place.formatted_address || '');
          onSelect({
            address: streetAddress || place.formatted_address || '',
            suburb,
            state,
            postcode,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          });
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
