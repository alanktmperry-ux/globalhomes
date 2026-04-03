import { useEffect, useRef } from 'react';
import type { ComparableSale } from '@/hooks/useComparableSales';

interface Props {
  subjectLat: number;
  subjectLng: number;
  subjectAddress: string;
  comps: ComparableSale[];
}

declare const google: any;

function formatPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1000).toFixed(0)}k`;
}

export function ComparableSalesMap({ subjectLat, subjectLng, subjectAddress, comps }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || typeof google === 'undefined') return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: subjectLat, lng: subjectLng },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    // Subject property marker (blue)
    new google.maps.Marker({
      position: { lat: subjectLat, lng: subjectLng },
      map,
      title: subjectAddress,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: 'hsl(221, 83%, 53%)',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      zIndex: 100,
    });

    const infoWindow = new google.maps.InfoWindow();
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: subjectLat, lng: subjectLng });

    comps.forEach(comp => {
      if (!comp.lat || !comp.lng) return;

      const marker = new google.maps.Marker({
        position: { lat: Number(comp.lat), lng: Number(comp.lng) },
        map,
        title: comp.address,
        label: {
          text: formatPrice(comp.sold_price),
          color: '#fff',
          fontSize: '10px',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: 'hsl(239, 84%, 67%)',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        zIndex: 50,
      });

      bounds.extend({ lat: Number(comp.lat), lng: Number(comp.lng) });

      marker.addListener('click', () => {
        const soldDate = new Date(comp.sold_at).toLocaleDateString('en-AU', {
          month: 'short', year: 'numeric'
        });
        infoWindow.setContent(`
          <div style="padding:4px;min-width:140px">
            <strong>${formatPrice(comp.sold_price)}</strong><br/>
            <span style="font-size:12px">${comp.address}</span><br/>
            <span style="font-size:11px;color:#666">${comp.beds}bd · ${comp.baths}ba · Sold ${soldDate}</span>
          </div>
        `);
        infoWindow.open(map, marker);
      });
    });

    if (comps.length > 0) {
      map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
    }
  }, [subjectLat, subjectLng, subjectAddress, comps]);

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-[300px] rounded-xl" />
      <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] font-medium text-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary inline-block" />
          This listing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[hsl(239,84%,67%)] inline-block" />
          Comparable sale
        </span>
      </div>
    </div>
  );
}
