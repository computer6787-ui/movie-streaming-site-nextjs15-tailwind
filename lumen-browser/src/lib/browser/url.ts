/**
 * URL normalisation and "is this a URL or a search query?" heuristics.
 *
 * This is the only place that decides how raw address-bar text becomes a URL,
 * so the behaviour stays consistent between the address bar, the new tab page
 * and restored sessions.
 */

/** Schemes an <iframe src> can actually render. */
export const RENDERABLE_PROTOCOLS = ["http:", "https:"] as const;

const KNOWN_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HAS_DOT = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const LOCALHOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
/** A bare host, optionally with a port and/or path — "a.com", "a.com:8080/x". */
const BARE_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?(\/.*)?$/i;
/** A block-rule pattern: a host, optionally wildcard-prefixed — "*.a.com". */
const HOST_PATTERN = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const HAS_SCHEME_LIKE_PATH = /^[a-z][a-z0-9+.-]*:\/\//i;

export interface ParsedInput {
  kind: "url" | "search";
  /** Present when kind === "url" */
  url?: string;
  /** Present when kind === "search" */
  query?: string;
  /** True when the user typed a scheme we can't render in a frame. */
  unsupportedProtocol?: string;
}

/**
 * Hosts that are fine to drop "https://" onto by default.
 *
 * A dotted name or a loopback address only counts if the WHOLE input is that
 * host, so a stray fragment or path cannot sneak through as a hostname.
 */
function isLikelyHost(input: string): boolean {
  // Strip any port before judging the name, then require the whole input to be
  // a plausible host + optional port + optional path.
  const authority = input.split(/[/?#]/, 1)[0].replace(/:\d+$/, "");
  return (HAS_DOT.test(authority) || LOCALHOST.test(authority)) && BARE_HOST.test(input);
}

/**
 * Turn raw address-bar text into either a normalised URL or a search query.
 *
 * Examples:
 *   example.com            -> https://example.com/
 *   https://example.com/x  -> https://example.com/x
 *   example.com:8080       -> https://example.com:8080/
 *   localhost:3000         -> http://localhost:3000/
 *   cats                   -> { kind: "search", query: "cats" }
 *   mailto:a@b.com         -> { kind: "url", unsupportedProtocol: "mailto:" }
 */
export function parseInput(raw: string, searchEnabled: boolean): ParsedInput {
  const input = raw.trim();
  if (!input) return { kind: "search", query: "" };

  // Explicit scheme with an authority, e.g. https://…
  if (HAS_SCHEME_LIKE_PATH.test(input)) {
    try {
      const u = new URL(input);
      if (isRenderable(u.protocol)) {
        return { kind: "url", url: normalizeUrl(u.toString()) };
      }
      return {
        kind: "url",
        url: input,
        unsupportedProtocol: u.protocol.replace(":", ""),
      };
    } catch {
      return { kind: "search", query: input };
    }
  }

  // Other schemes: mailto:, tel:, about:, data:, javascript: …
  if (KNOWN_SCHEME.test(input)) {
    const scheme = input.slice(0, input.indexOf(":") + 1).toLowerCase();
    // "localhost:3000" and "example.com:8080" look exactly like a scheme, but
    // they are hosts with a port. Decide that before treating them as one.
    if (!isLikelyHost(input)) {
      // Deliberately NOT normalised: this string is reported to the user as the
      // offending scheme and is never handed to an iframe as a src.
      return { kind: "url", url: input, unsupportedProtocol: scheme.replace(":", "") };
    }
  }

  // "example.com", "example.com:8080/path?q=1", "localhost:3000"
  if (isLikelyHost(input)) {
    try {
      const withScheme = `${LOCALHOST.test(input) ? "http" : "https"}://${input}`;
      return { kind: "url", url: normalizeUrl(withScheme) };
    } catch {
      /* fall through to search */
    }
  }

  if (searchEnabled) return { kind: "search", query: input };
  return { kind: "search", query: input };
}

export function isRenderable(protocol: string): boolean {
  return (RENDERABLE_PROTOCOLS as readonly string[]).includes(protocol);
}

/**
 * True when a string is a usable blocking-rule pattern: a host name, optionally
 * wildcard-prefixed ("ads.example.com" / "*.example.com").
 *
 * Used to validate anything arriving from storage or the Privacy panel, so a
 * malformed pattern is rejected rather than stored and silently never matching.
 */
export function isHostPattern(input: string): boolean {
  return HOST_PATTERN.test(input.trim());
}

/**
 * Canonical form used for de-duplication and display:
 * lower-cased host, no trailing "www.", default ports and no trailing slash
 * on the bare origin. Paths/queries are preserved.
 */
export function normalizeUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return input;
  }
  if (!isRenderable(u.protocol)) return input;

  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");

  if (
    (u.protocol === "https:" && u.port === "443") ||
    (u.protocol === "http:" && u.port === "80")
  ) {
    u.port = "";
  }

  if (u.pathname === "/") u.pathname = "";
  // `URL` re-adds the leading slash for the origin-only case above.
  return u.toString();
}

/** Short, human label for a URL (used in tabs, history, new tab page). */
export function prettyUrl(input: string): string {
  try {
    const u = new URL(input);
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}${u.search}`;
  } catch {
    return input;
  }
}

export function originOf(input: string): string | null {
  try {
    return new URL(input).origin;
  } catch {
    return null;
  }
}

export function isSecure(input: string): boolean {
  try {
    return new URL(input).protocol === "https:";
  } catch {
    return false;
  }
}

/** Title fallback when a tab has not reported one yet. */
export function titleFromUrl(input: string): string {
  if (!input) return "New Tab";
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    if (u.pathname === "/" || !u.pathname) return host;
    const segment = u.pathname.split("/").filter(Boolean).pop();
    const pretty = (segment ?? host)
      .replace(/\.[a-z0-9]{2,6}$/i, "")
      .replace(/[-_+]+/g, " ")
      .trim();
    return pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : host;
  } catch {
    return input;
  }
}
