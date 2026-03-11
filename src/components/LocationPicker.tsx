import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

// Fix Vite bundler breaking Leaflet's default marker icons
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const GEOCODE_BASE = 'https://motofix-service-requests.onrender.com';

interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

export function LocationPicker({ onLocationChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [address, setAddress] = useState<string>('');
  const [addressStatus, setAddressStatus] = useState<'loading' | 'done' | 'error'>('loading');

  const fetchAddress = async (lat: number, lng: number) => {
    setAddressStatus('loading');
    try {
      const res = await fetch(`${GEOCODE_BASE}/geocode/reverse?lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error('Geocode failed');
      const data = await res.json();
      const resolved: string =
        data.display_name ||
        data.address ||
        `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(resolved);
      setAddressStatus('done');
      onLocationChange(lat, lng, resolved);
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(fallback);
      setAddressStatus('error');
      onLocationChange(lat, lng, fallback);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default: Kampala centre
    const defaultLat = 0.3476;
    const defaultLng = 32.5825;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      fetchAddress(lat, lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Request GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 16);
          marker.setLatLng([latitude, longitude]);
          fetchAddress(latitude, longitude);
        },
        () => {
          // Fallback: use Kampala default
          fetchAddress(defaultLat, defaultLng);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      fetchAddress(defaultLat, defaultLng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={mapContainerRef}
        className="w-full rounded-xl overflow-hidden border-2 border-border"
        style={{ height: 200 }}
      />
      <div className="text-sm text-muted-foreground flex items-start gap-2 min-h-[1.5rem]">
        {addressStatus === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
            <span>Finding address…</span>
          </>
        ) : (
          <span className="line-clamp-2" title={address}>
            📍 {address || 'Drag the pin to set your location'}
          </span>
        )}
      </div>
    </div>
  );
}
