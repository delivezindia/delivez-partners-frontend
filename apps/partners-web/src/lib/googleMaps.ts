import { Loader } from '@googlemaps/js-api-loader';

/** Browser key for the Maps JavaScript API, Places API (New) and Geocoding API. */
export const MAPS_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || undefined;

let loader: Loader | null = null;
let authFailed = false;
const failListeners = new Set<() => void>();

// Google calls this global when the key is rejected (wrong referrer, API not enabled, billing off).
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  authFailed = true;
  failListeners.forEach((f) => f());
};

export const mapsAuthFailed = () => authFailed;
export function onMapsAuthFailure(f: () => void) {
  failListeners.add(f);
  return () => failListeners.delete(f);
}

/** Loads one Maps library on demand; the script is fetched once per page. */
export function mapsLibrary<K extends 'maps' | 'places' | 'geocoding' | 'marker' | 'core'>(name: K) {
  if (!MAPS_KEY) return Promise.reject(new Error('Google Maps key not configured'));
  loader ??= new Loader({ apiKey: MAPS_KEY, version: 'weekly', region: 'IN', language: 'en' });
  return loader.importLibrary(name as Parameters<Loader['importLibrary']>[0]) as Promise<
    K extends 'maps' ? google.maps.MapsLibrary : K extends 'places' ? google.maps.PlacesLibrary : K extends 'geocoding' ? google.maps.GeocodingLibrary : K extends 'marker' ? google.maps.MarkerLibrary : google.maps.CoreLibrary
  >;
}

export interface ParsedAddress {
  label: string;
  line1: string;
  pincode: string | null;
  city: string | null;
  state: string | null;
}

/** Turns Google address components into our fields. Works for Geocoder (long_name) and Places New (longText). */
export function parseAddress(formatted: string, parts: { types: string[]; long_name?: string; longText?: string | null }[]): ParsedAddress {
  const get = (type: string) => {
    const p = parts.find((c) => c.types.includes(type));
    return p ? (p.longText ?? p.long_name ?? null) : null;
  };
  const line1 = [get('premise') ?? get('street_number'), get('route'), get('sublocality_level_2'), get('sublocality_level_1') ?? get('sublocality') ?? get('neighborhood')]
    .filter(Boolean)
    .join(', ');
  return {
    label: formatted,
    line1: line1 || formatted.split(',').slice(0, 3).join(',').trim(),
    pincode: get('postal_code'),
    city: get('locality') ?? get('administrative_area_level_3'),
    state: get('administrative_area_level_1'),
  };
}
