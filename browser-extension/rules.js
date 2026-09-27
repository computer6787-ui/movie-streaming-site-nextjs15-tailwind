/* =====================================================================
 * Chitralipi Ad Blocker - rule definitions
 *
 * rules.json holds the same data as STATIC_RULES (kept in sync manually)
 * so the extension can also load as a fully static fallback. background.js
 * imports STATIC_RULES to report the count in the popup.
 * ===================================================================== */

/** Default filter lists - the same ones uBlock Origin enables out of the box. */
export const EASYLIST_URLS = [
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easylist_easyprivacy.txt",
  "https://easylist.to/easylist/fanboy-annoyance.txt",
];

/** Dynamic rule ids start here; keep below 2^31 and away from static ids. */
export const RULE_ID_START = 100000;

/** Chrome caps dynamic rules per extension; leave headroom. */
export const MAX_DYNAMIC_RULES = 5000;

/** Alarm name for the periodic list refresh. */
export const REFRESH_ALARM = "chitralipi-refresh";

/** Hosts that only ever serve advertising / tracking on this site. */
export const AD_HOSTS = [
  // --- Confirmed live on the vidsrc.mov -> vsembed.ru player chain (Sept 2026) ---
  "dpjf9a2rbjbvp.cloudfront.net", // popunder / clickbait loader injected by the embed page
  "s10.histats.com",              // Histats tracker (js15_as.js)
  "sstatic1.histats.com",         // Histats 1x1 tracking pixel
  "static.cloudflareinsights.com",// Cloudflare Web Analytics beacon
  // --- Standard ad / tracking networks (kept as safety net) ---
  "doubleclick.net", "googlesyndication.com", "googleadservices.com",
  "adservice.google.com", "google-analytics.com", "analytics.google.com",
  "googletagmanager.com", "amazon-adsystem.com", "adnxs.com",
  "rubiconproject.com", "pubmatic.com", "openx.net", "criteo.com",
  "criteo.net", "casalemedia.com", "smartadserver.com", "smaato.net",
  "teads.tv", "adform.net", "contextweb.com", "gumgum.com", "media.net",
  "plista.com", "taboola.com", "outbrain.com", "zemanta.com",
  "revcontent.com", "mgid.com", "adcash.com", "propellerads.com",
  "adsterra.com", "hilltopads.net", "exoclick.com", "exosrv.com",
  "juicyads.com", "popads.net", "popcash.net", "poperblock.com",
  "popsbox.com", "onclickalgo.com", "onclckds.com", "clickadu.com",
  "adskeeper.com", "zedo.com", "bidvertiser.com", "trafficjunky.com",
  "monetiz.com", "rotatorads.com", "adhigh.net", "luckyorange.com",
  "trafficmonetizer.org", "pushmonetization.com", "notification-ads.com",
  "dataprotection.eu",
];

/** Player hosts we embed. Playback is allowed; ad paths are blocked below. */
export const PLAYER_BLOCK_HOSTS = [
  "vidsrc.mov", "vidsrc.to", "vidsrc.xyz", "vidsrc.in",
  // Inner frame of vidsrc.mov/embed/movie/{id} - confirmed live.
  "vsembed.ru",
  "streamtape.com", "filemoon.sx", "mixdrop.co", "streamwish.com",
  "vidstream.pro",
];

/** Player hosts that serve the actual video - never block these. */
export const ALLOW_HOSTS = [
  "vidsrc.mov", "vidsrc.to", "vidsrc.xyz", "vidsrc.in",
  "vsembed.ru",
  "streamtape.com", "filemoon.sx", "mixdrop.co", "streamwish.com",
  "vidstream.pro", "api.themoviedb.org", "image.tmdb.org",
];

/**
 * Only these ad/popunder *paths* on the player hosts are blocked. The
 * document and the player scripts stay reachable, so playback keeps
 * working while click-outs, popunder triggers and tracking pings die.
 */
export const PLAYER_BLOCK_PATHS = [
  "/ads/",
  "/ad/",
  "/adv/",
  "/banner",
  "/pop",
  "/popunder",
  "/clickout",
  "/click-out",
  "/track",
  "/tracker",
  "/pixel",
  "/beacon",
  "/notify",
  "/push",
  "/landing",
  "/redirect",
  "/go",
  "/away",
  "/out",
  "/fresh",
  "/count",
  "/stat",
  "/analytics",
  "/cserve",
  "/aff",
];

const ALL_TYPES = [
  "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other",
];

const NON_DOC_TYPES = ALL_TYPES.filter((t) => t !== "main_frame");

/**
 * Build the static rule array.
 *   - one `block` rule per ad/tracking host (kills the network request)
 *   - one `block` rule per (player host x ad path) so the player's own
 *     popunder/click-out endpoints are cut without touching playback
 */
function buildStaticRules() {
  const rules = [];
  let id = 1;

  for (const host of AD_HOSTS) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: { requestDomains: [host], resourceTypes: ALL_TYPES },
    });
  }

  for (const host of PLAYER_BLOCK_HOSTS) {
    for (const path of PLAYER_BLOCK_PATHS) {
      rules.push({
        id: id++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "||" + host + path,
          resourceTypes: NON_DOC_TYPES,
        },
      });
    }
  }

  return rules;
}

export const STATIC_RULES = buildStaticRules();
