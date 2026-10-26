/**
 * Where the API lives. Empty (default) = same origin: the Vite dev proxy locally, or a server that proxies /v1.
 * Hosting the web app separately from the API: build with VITE_API_URL=https://api.example.com
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Absolute URL for an API path, e.g. apiUrl('/v1/i18n/HI'). */
export const apiUrl = (path: string) => `${API_URL}${path}`;

/** The partner site (shop owners sign up there). Override with VITE_PARTNERS_URL. */
export const PARTNERS_URL: string = import.meta.env.VITE_PARTNERS_URL || 'https://partners.delivez.com';
