/**
 * Referrer & Thumbnail Utilities
 *
 * Provides two core helpers used across the entire app:
 *
 * 1. getReferrer()     — fetches the Referer header value from the remote
 *                        reference.json exactly once and caches it in-memory
 *                        for the lifetime of the app session.
 *
 * 2. getThumbnailUrl() — prepends the youtube-anime CDN proxy prefix to any
 *                        raw thumbnail path returned by the API so that images
 *                        can be loaded through the proxy layer.
 *
 * Usage
 * -----
 *   import { getReferrer, getThumbnailUrl } from './referrer';
 *
 *   // In a fetch call:
 *   const referrer = await getReferrer();
 *   const response = await fetch(url, { headers: { Referer: referrer } });
 *
 *   // In JSX image source:
 *   <Image source={{ uri: getThumbnailUrl(item.thumbnail) }} />
 */

const REFERENCE_URL = 'https://heavenscape.vercel.app/reference.json';


// ---------------------------------------------------------------------------
// Referrer cache
// ---------------------------------------------------------------------------

let _cachedReferrer: string | null = null;
let _inflightPromise: Promise<string> | null = null;

/**
 * Returns the Referer string from the remote reference.json.
 *
 * The network request is made at most once per app session; subsequent calls
 * return the cached value immediately.  Concurrent callers that arrive while
 * the first request is still in-flight all share the same promise so that only
 * one HTTP request is ever made.
 *
 * Falls back to an empty string if the request fails so that callers never
 * need special-case error handling just for the Referer header.
 */
export function getReferrer(): Promise<string> {
  // Fast path: already fetched
  if (_cachedReferrer !== null) {
    return Promise.resolve(_cachedReferrer);
  }

  // In-flight path: reuse the existing promise
  if (_inflightPromise !== null) {
    return _inflightPromise;
  }

  // First call: fire the request and cache the promise reference
  _inflightPromise = fetch(REFERENCE_URL)
    .then((response) => {
      if (!response.ok) {
        console.warn(`[referrer] reference.json responded with ${response.status}`);
        return {} as { referer?: unknown };
      }
      return response.json() as Promise<{ referer?: unknown }>;
    })
    .then((data) => {
      // data may be '' (from the !ok branch above) or the parsed JSON object
      const value =
        data !== null &&
        typeof data === 'object' &&
        'referer' in data &&
        typeof (data as Record<string, unknown>).referer === 'string'
          ? (data as Record<string, string>).referer
          : '';
      _cachedReferrer = value;
      console.log(`[referrer] Loaded referrer: ${_cachedReferrer}`);
      return _cachedReferrer;
    })
    .catch((err) => {
      console.error('[referrer] Failed to fetch reference.json:', err);
      _cachedReferrer = '';
      return _cachedReferrer;
    })
    .finally(() => {
      // Clear the in-flight slot so subsequent calls can re-enter if needed,
      // but _cachedReferrer is already set so they will take the fast path.
      _inflightPromise = null;
    });

  return _inflightPromise;
}

// ---------------------------------------------------------------------------
// Thumbnail URL helper
// ---------------------------------------------------------------------------

/**
 * Returns the raw thumbnail URL/path as it is received.
 *
 * @param rawUrl - The thumbnail string returned by the API.
 * @returns The original thumbnail string or an empty string.
 */
export function getThumbnailUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) {
    return '';
  }

  return rawUrl;
}
