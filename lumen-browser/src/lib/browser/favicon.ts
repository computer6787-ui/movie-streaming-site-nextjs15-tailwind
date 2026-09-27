/**
 * Favicon resolution.
 *
 * We ask the site's own origin for /favicon.ico. That is a request the *host
 * browser* makes and Lumen cannot see its response body, so we use the URL
 * optimistically in <img>. A missing icon simply renders our generated letter
 * fallback — no lie is told and nothing is "blocked".
 */

import { originOf } from "./url";

const FAVICON_CACHE = new Map<string, string>();
const FAILED = new Set<string>();

export function faviconFor(url: string): string | undefined {
  if (!url) return undefined;
  const origin = originOf(url);
  if (!origin || !/^https?:$/.test(new URL(url).protocol)) return undefined;

  const cached = FAVICON_CACHE.get(origin);
  if (cached) return cached;
  if (FAILED.has(origin)) return undefined;

  return `${origin}/favicon.ico`;
}

/** Called by <img onError> so we stop retrying a missing icon. */
export function markFaviconFailed(url: string): void {
  const origin = originOf(url);
  if (origin) FAILED.add(origin);
}

/** Warm the cache once an icon loads, so later tabs render instantly. */
export function rememberFavicon(url: string, src: string): void {
  const origin = originOf(url);
  if (origin) FAVICON_CACHE.set(origin, src);
}

/** Deterministic hue from a hostname — used for the letter fallback. */
export function hueForHost(url: string): number {
  let host = "lumen";
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep default */
  }
  let hash = 0;
  for (let i = 0; i < host.length; i += 1) {
    hash = (hash << 5) - hash + host.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function initialFor(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.charAt(0).toUpperCase() || "?";
  } catch {
    return "?";
  }
}
