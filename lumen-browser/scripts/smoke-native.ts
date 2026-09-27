/**
 * Runtime smoke test for the native (Electron) blocking core.
 *
 * Run with:  node --experimental-strip-types scripts/smoke-native.ts
 *
 * These are the guarantees the native layer claims. They run OUTSIDE Electron
 * on purpose: filterlist.ts imports nothing from Electron, so every decision
 * below is reproducible in plain Node and cannot quietly depend on a runtime
 * being present.
 */
import assert from "node:assert/strict";
import {
  decideRequest,
  decidePopup,
  decideNavigation,
  matchesPattern,
  isMediaLike,
} from "../electron/filterlist.ts";

const ON = {
  enabled: true,
  allowlist: [] as string[],
  blocklist: [] as string[],
  blockUrlSignatures: true,
};

let pass = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.log(`  FAIL ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

const req = (url: string, resourceType = "other") =>
  decideRequest({ url, resourceType }, ON);

console.log("\nmedia must survive");
for (const [name, url] of [
  ["HLS playlist", "https://cdn.site.com/hls/master.m3u8"],
  ["DASH manifest", "https://cdn.site.com/manifest.mpd?token=1"],
  ["MP4", "https://cdn.site.com/v.mp4"],
  ["WebM", "https://cdn.site.com/v.webm"],
  ["TS segment", "https://cdn.site.com/seg12.ts"],
  ["fMP4 chunk", "https://cdn.site.com/chunk-4.m4s"],
  ["audio aac", "https://cdn.site.com/a.aac"],
] as const) {
  check(`${name} is allowed`, () => assert.equal(req(url, "media").action, "allow"));
}
check("websocket is allowed", () =>
  assert.equal(req("wss://live.site.com/socket", "websocket").action, "allow"));
check("ordinary script is allowed", () =>
  assert.equal(req("https://site.com/app.js", "script").action, "allow"));
check("ordinary fetch is allowed", () =>
  assert.equal(req("https://site.com/api/user", "xhr").action, "allow"));

console.log("\nad and tracking must be blocked");
check("doubleclick script", () =>
  assert.equal(req("https://pagead2.googlesyndication.com/p/x.js", "script").action, "block"));
check("adnxs", () =>
  assert.equal(req("https://secure.adnxs.com/get?x", "xhr").action, "block"));
check("taboola", () =>
  assert.equal(req("https://trc.taboola.com/ct", "xhr").action, "block"));
check("outbrain", () =>
  assert.equal(req("https://widgets.outbrain.com/ob_arc.js", "script").action, "block"));
check("hotjar", () =>
  assert.equal(req("https://static.hotjar.com/c.js", "script").action, "block"));
check("google analytics style /gpt/", () =>
  assert.equal(req("https://site.com/gpt/frame.js", "script").action, "block"));
check("tracking pixel", () =>
  assert.equal(req("https://site.com/pixel?u=1", "image").action, "block"));

console.log("\nsite content must not be collateral damage");
check("a page that merely lives under /ads/ still loads", () =>
  assert.equal(req("https://site.com/ads/account/login", "mainFrame").action, "allow"));
check("a site called pixel-solutions.com is fine", () =>
  assert.equal(req("https://pixel-solutions.com/app.js", "script").action, "allow"));
check("an ad-named path on the main frame is not signature-blocked", () =>
  assert.equal(req("https://site.com/adserver/home", "mainFrame").action, "allow"));

console.log("\nuser rules take priority");
check("blocklist beats an allowed media host", () =>
  assert.equal(
    decideRequest({ url: "https://cdn.badsite.com/v.mp4", resourceType: "media" },
      { ...ON, blocklist: ["badsite.com"] }).action,
    "block",
  ));
check("allowlist overrides the shipped ad list", () =>
  assert.equal(
    decideRequest({ url: "https://x.doubleclick.net/a.js", resourceType: "script" },
      { ...ON, allowlist: ["doubleclick.net"] }).action,
    "allow",
  ));
check("disabled config allows everything", () =>
  assert.equal(
    decideRequest({ url: "https://pagead2.googlesyndication.com/p/x.js" },
      { ...ON, enabled: false }).action,
    "allow",
  ));

console.log("\npopups");
check("ad-host popup is blocked", () =>
  assert.equal(decidePopup("https://ads.doubleclick.net/x", ON).action, "block"));
check("ad-shaped popup is blocked", () =>
  assert.equal(decidePopup("https://site.com/ads/landing", ON).action, "block"));
check("first-party popup is allowed", () =>
  assert.equal(decidePopup("https://site.com/help", ON).action, "allow"));
check("OAuth popup is allowed", () =>
  assert.equal(decidePopup("https://accounts.google.com/o/oauth2/auth", ON).action, "allow"));
check("cross-site normal popup is allowed", () =>
  assert.equal(decidePopup("https://other.com/docs", ON).action, "allow"));

console.log("\nnavigation");
check("normal external navigation is allowed", () =>
  assert.equal(decideNavigation("https://other.com/page", ON).action, "allow"));
check("navigation to an ad host is blocked", () =>
  assert.equal(decideNavigation("https://trc.taboola.com/x", ON).action, "block"));
check("navigation to a blocklisted host is blocked", () =>
  assert.equal(
    decideNavigation("https://evil.example/x", { ...ON, blocklist: ["evil.example"] }).action,
    "block",
  ));

console.log("\nhelpers");
check("wildcard matches subdomain", () =>
  assert.equal(matchesPattern("a.tracker.net", "*.tracker.net"), true));
check("isMediaLike detects m3u8", () =>
  assert.equal(isMediaLike({ url: "https://c.com/a.m3u8" }), true));
check("isMediaLike ignores a script", () =>
  assert.equal(isMediaLike({ url: "https://c.com/a.js", resourceType: "script" }), false));

console.log(`\n${pass} checks passed\n`);
