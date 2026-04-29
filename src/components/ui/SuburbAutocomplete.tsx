/// <reference types="google.maps" />
import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMapsScript } from '@/shared/lib/googleMapsService';

interface Props {
  value: string;
  onChange: (raw: string) => void;
  onSelect: (suburb: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/** Extract clean suburb name from a Google place (AU regions). */
function extractSuburbName(place: google.maps.places.PlaceResult): string {
  const components = place.address_components || [];
  const get = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name ?? '';
  return (
    get('locality') ||
    get('sublocality_level_1') ||
    get('sublocality') ||
    get('postal_town') ||
    get('administrative_area_level_2') ||
    (place.name ?? '').split(',')[0].trim()
  );
}

export function SuburbAutocomplete({
  value, onChange, onSelect, onKeyDown, placeholder, className, id, disabled
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
        if (cancelled || !inputRef.current || acRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'au' },
          types: ['(regions)'],
          fields: ['address_components', 'name', 'formatted_address'],
        });

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.address_components && !place.name) return;
          const suburb = extractSuburbName(place);
          if (suburb) onSelect(suburb);
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
  }, [onSelect]);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
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
        onKeyDown={onKeyDown}
        onMouseDown={(e) => { e.currentTarget.focus(); }}
        placeholder={placeholder ?? 'Start typing a suburb…'}
        className={`${!fallback ? 'pl-8' : ''} ${className ?? ''} relative z-0`}
        autoComplete="off"
        disabled={disabled}
      />
    </div>
  );
}
