/**
 * Filter-list matching — the pure core shared by the native guards.
 *
 * This module deliberately imports NOTHING from Electron. Everything here is
 * plain TypeScript that runs and is unit-tested outside the Electron runtime,
 * which is what makes the blocking decisions verifiable rather than assumed.
 *
 * HONESTY RULE, enforced below: a decision is only ever reported as "blocked"
 * when the caller has actually prevented the request/navigation. This file
 * produces *advice* ("you asked about X, the answer is block/allow"); turning
 * that into a fact is the guard's job, and the guard only logs a BLOCK line once
 * Chromium has confirmed the cancellation.
 */

/** Path fragments typical of ad endpoints. */
const AD_URL_TOKENS = [
  "/pagead/",
  "/pagead2/",
  "/ads/",
  "/adserver/",
  "/adframe/",
  "/gpt/",
  "/adsense",
  "/adclient",
  "/adsystem",
];

/** Path/query fragments typical of tracking pixels and impression beacons. */
const TRACKING_TOKENS = [
  "/pixel",
  "/beacon",
  "/telemetry",
  "/track?",
  "/tracking",
  "/impression",
];

/** Media that is NEVER blocked by a generic signature rule. */
const MEDIA_EXT =
  /\.(m3u8|mpd|ts|m4s|mp4|webm|mov|flv|aac|mp3|opus|ogg)(\?|$)/i;

/** Ad infrastructure, matched exactly or as a parent domain. */
export const DEFAULT_AD_HOSTS = [
  "doubleclick.net",
  "googlesyndication.com",
  "adservice.google.com",
  "googleadservices.com",
  "adnxs.com",
  "criteo.com",
  "criteo.net",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "casalemedia.com",
  "indexexchange.com",
  "adform.net",
  "smartadserver.com",
  "adroll.com",
  "ad-delivery.net",
  "amazon-adsystem.com",
  "yieldmo.com",
  "media.net",
  "adcolony.com",
];

/** Taboola/Outbrain are "sponsored content" units that hijack the page. */
export const DEFAULT_RECO_HOSTS = ["outbrain.com", "taboola.com", "zergnet.com"];

/** Session-replay / analytics beacons. */
export const DEFAULT_TRACKER_HOSTS = [
  "hotjar.com",
  "segment.io",
  "mixpanel.com",
  "amplitude.com",
  "fullstory.com",
  "mouseflow.com",
  "clarity.ms",
  "scorecardresearch.com",
  "quantserve.com",
  "branch.io",
  "chartbeat.com",
  "newrelic.com",
];

export type DecisionAction = "allow" | "block";
export type DecisionReason =
  | "user-allowlist"
  | "user-blocklist"
  | "ad-url-signature"
  | "tracking-url-signature"
  | "ad-host"
  | "recommendation-host"
  | "tracker-host"
  | "default-allow";

export interface RequestInfo {
  url: string;
  /** Electron `webRequest` resourceType. */
  resourceType?: string;
}

export interface Decision {
  action: DecisionAction;
  reason: DecisionReason;
  /** The rule that matched, echoed into the log line. */
  pattern?: string;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Mirrors `matchesPattern` in lib/blocking/rules-engine.ts. */
export function matchesPattern(hostname: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (!p) return false;
  const host = hostname.toLowerCase();
  if (p.startsWith("*.")) {
    const base = p.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }
  return host === p || host.endsWith(`.${p}`);
}

/**
 * Match a signature token against the PATH/QUERY only — never the hostname.
 *
 * This distinction is the whole ballgame for a signature-based blocker: a
 * substring search over the entire URL blocks innocent hosts like
 * `pixel-solutions.com`, `tracker-corp.com` and `adagency.io` purely because
 * the word appears in their domain name. A site that merely has "pixel" in its
 * name is a real business, not an ad network.
 */
function firstToken(url: string, tokens: string[]): string | undefined {
  let path: string;
  try {
    const u = new URL(url);
    path = (u.pathname + u.search).toLowerCase();
  } catch {
    return undefined;
  }
  return tokens.find((t) => path.includes(t));
}

export interface FilterConfig {
  enabled: boolean;
  allowlist: string[];
  blocklist: string[];
  /** Operator switch for the generic URL-shape rules. */
  blockUrlSignatures: boolean;
}

/** True when this request looks like media/streaming telemetry we leave alone. */
export function isMediaLike(info: RequestInfo): boolean {
  if (info.resourceType === "media") return true;
  return MEDIA_EXT.test(info.url);
}

/**
 * Decide a single subresource request.
 *
 * Order is deliberate:
 *   1. Allowlist  — the operator's override always wins, even over the
 *                   shipped ad list.
 *   2. Blocklist  — explicit user rules. These run BEFORE the media check, so
 *                   an operator can still block a specific video host.
 *   3. Known ad / recommendation / tracker hosts — applied to every resource
 *                   type. An ad served as an "xhr" is still an ad.
 *   4. URL-shape heuristics — subresources only, never the main document and
 *                   never media, so a stream on a CDN is not clipped.
 */
export function decideRequest(info: RequestInfo, config: FilterConfig): Decision {
  const host = hostnameOf(info.url);
  if (!host) return { action: "allow", reason: "default-allow" };
  if (!config.enabled) return { action: "allow", reason: "default-allow" };

  for (const pattern of config.allowlist) {
    if (matchesPattern(host, pattern)) {
      return { action: "allow", reason: "user-allowlist", pattern };
    }
  }

  for (const pattern of config.blocklist) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "user-blocklist", pattern };
    }
  }

  for (const pattern of DEFAULT_AD_HOSTS) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "ad-host", pattern };
    }
  }
  for (const pattern of DEFAULT_RECO_HOSTS) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "recommendation-host", pattern };
    }
  }
  for (const pattern of DEFAULT_TRACKER_HOSTS) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "tracker-host", pattern };
    }
  }

  if (
    config.blockUrlSignatures &&
    info.resourceType !== "mainFrame" &&
    !isMediaLike(info)
  ) {
    const ad = firstToken(info.url, AD_URL_TOKENS);
    if (ad) return { action: "block", reason: "ad-url-signature", pattern: ad };
    const track = firstToken(info.url, TRACKING_TOKENS);
    if (track) return { action: "block", reason: "tracking-url-signature", pattern: track };
  }

  return { action: "allow", reason: "default-allow" };
}

/**
 * Decide a new window (window.open / target=_blank / middle-click).
 *
 * A popup is refused only with a concrete reason: a blocklist hit, a known ad
 * host, or an ad-shaped URL. A plain first-party window.open — the kind real
 * sites use for OAuth, help pages and share dialogs — is allowed through.
 */
export function decidePopup(url: string, config: FilterConfig): Decision {
  const host = hostnameOf(url);
  if (!host) return { action: "allow", reason: "default-allow" };
  if (!config.enabled) return { action: "allow", reason: "default-allow" };

  for (const pattern of config.allowlist) {
    if (matchesPattern(host, pattern)) {
      return { action: "allow", reason: "user-allowlist", pattern };
    }
  }
  for (const pattern of config.blocklist) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "user-blocklist", pattern };
    }
  }
  for (const pattern of DEFAULT_AD_HOSTS) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "ad-host", pattern };
    }
  }
  for (const pattern of DEFAULT_RECO_HOSTS) {
    if (matchesPattern(host, pattern)) {
      return { action: "block", reason: "recommendation-host", pattern };
    }
  }
  if (config.blockUrlSignatures) {
    const ad = firstToken(url, AD_URL_TOKENS);
    if (ad) return { action: "block", reason: "ad-url-signature", pattern: ad };
  }
  return { action: "allow", reason: "default-allow" };
}

/**
 * Decide a top-level navigation.
 *
 * "External" is never a block reason on its own. Only a blocklist or known-ad
 * hit is refused, so sign-in redirects, payment returns and ordinary
 * link-following keep working.
 */
export function decideNavigation(url: string, config: FilterConfig): Decision {
  return decidePopup(url, config);
}
