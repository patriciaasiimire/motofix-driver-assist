/**
 * Free reverse geocoding via OpenStreetMap Nominatim.
 * Usage policy: max 1 request per second. No API key required.
 * @see https://nominatim.org/release-docs/develop/api/Reverse/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'MotofixDriverApp/1.0 (contact@motofix.org)';
const MIN_INTERVAL_MS = 1000; // 1 request per second
let lastRequestTime = 0;

function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS && lastRequestTime > 0) {
    return new Promise((resolve) =>
      setTimeout(resolve, MIN_INTERVAL_MS - elapsed)
    );
  }
  return Promise.resolve();
}

interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  village?: string;
  city?: string;
  town?: string;
  state?: string;
  country?: string;
  [key: string]: string | undefined;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

/**
 * Build a short, user-friendly address string from Nominatim address parts.
 * Prefer: road + suburb/landmark + city (e.g. "Entebbe Road near Shoprite, Kampala Central").
 */
function formatFriendlyAddress(address: NominatimAddress, displayName?: string): string {
  const road = address.road;
  const suburb = address.suburb || address.neighbourhood;
  const city = address.city || address.town || address.village;
  const parts: string[] = [];

  if (road) parts.push(road);
  if (suburb && suburb !== road) parts.push(suburb);
  if (city && city !== suburb) parts.push(city);

  if (parts.length > 0) {
    return parts.join(', ');
  }
  // Fallback: use first part of display_name (e.g. "Entebbe Road, Kampala Central, ..." -> "Entebbe Road, Kampala Central")
  if (displayName) {
    const firstTwo = displayName.split(',').slice(0, 2).map((s) => s.trim()).join(', ');
    if (firstTwo) return firstTwo;
  }
  return '';
}

/**
 * Reverse geocode coordinates to a human-readable address using Nominatim.
 * Respects 1 req/sec. Returns null on failure (caller should show fallback).
 * Only returns a display string — never the full API response.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  await throttle();
  lastRequestTime = Date.now();

  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lon),
    zoom: '18',
    addressdetails: '1',
  });
  const url = `${NOMINATIM_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return null;

    const data: NominatimResponse = await res.json();
    const address = data?.address;
    const displayName = data?.display_name;

    if (address) {
      const friendly = formatFriendlyAddress(address, displayName);
      if (friendly) return friendly;
    }
    if (typeof displayName === 'string' && displayName.trim()) {
      return displayName.split(',').slice(0, 2).map((s) => s.trim()).join(', ');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a location string looks like "lat, lon" coordinates.
 */
export function isCoordString(location: string): boolean {
  if (!location || typeof location !== 'string') return false;
  const trimmed = location.trim();
  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.length !== 2) return false;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Parse "lat, lon" string into { lat, lng }. Returns null if invalid.
 */
export function parseCoordString(location: string): { lat: number; lng: number } | null {
  if (!isCoordString(location)) return null;
  const parts = location.trim().split(',').map((p) => p.trim());
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  return { lat, lng };
}
