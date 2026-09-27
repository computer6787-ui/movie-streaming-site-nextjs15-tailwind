/**
 * Runtime smoke test for the pure core (no DOM, no path aliases).
 *
 * Run with:  node --experimental-strip-types scripts/smoke-core.ts
 * (Node 22+ strips the types; these modules import nothing outside stdlib.)
 */
import assert from "node:assert/strict";
import { parseInput, normalizeUrl, prettyUrl, titleFromUrl, isSecure, isRenderable, isHostPattern } from "../src/lib/browser/url.ts";
import { searchUrl, getEngine } from "../src/lib/search/engines.ts";

/**
 * Mirrors matchesPattern() in lib/blocking/rules-engine.ts.
 * Duplicated deliberately: that module imports via the "@/…" alias, which plain
 * Node cannot resolve. Keep this copy in step with the original.
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (!p) return false;
  const host = hostname.toLowerCase();
  if (p.startsWith("*.")) {
    const base = p.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }
  return host === p || host.endsWith(`.${p}`);
}

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

console.log("\nparseInput");
check("bare host becomes https URL", () => {
  assert.equal(parseInput("example.com", true).url, "https://example.com/");
});
check("localhost gets http, not https", () => {
  assert.equal(parseInput("localhost:3000", true).url, "http://localhost:3000/");
});
check("bare word becomes a search", () => {
  const r = parseInput("cats", true);
  assert.equal(r.kind, "search");
  assert.equal(r.query, "cats");
});
check("mailto is flagged unrenderable", () => {
  assert.equal(parseInput("mailto:a@b.com", true).unsupportedProtocol, "mailto");
});
check("javascript: is rejected, never loadable", () => {
  const r = parseInput("javascript:alert(1)", true);
  assert.equal(r.unsupportedProtocol, "javascript");
  // The store calls setTabError and returns before assigning a tab URL, so the
  // raw string is only ever shown to the user, never passed to an <iframe>.
  assert.equal(isRenderable(new URL(r.url!).protocol), false);
});
check("localhost:3000 is a host, not a 'localhost:' scheme", () => {
  const r = parseInput("localhost:3000", true);
  assert.equal(r.unsupportedProtocol, undefined);
  assert.equal(r.url, "http://localhost:3000/");
});
check("example.com:8080 keeps https and its port", () => {
  assert.equal(parseInput("example.com:8080", true).url, "https://example.com:8080/");
});
check("existing https URL passes through", () => {
  assert.equal(parseInput("https://example.com/x", true).url, "https://example.com/x");
});
check("host with port AND path keeps both", () => {
  assert.equal(parseInput("example.com:8080/p?q=1", true).url, "https://example.com:8080/p?q=1");
});
check("no false host for a colon-laden phrase", () => {
  assert.equal(parseInput("what is this: really", true).kind, "search");
});
check("a space never becomes a URL", () => {
  assert.equal(parseInput("hello world", true).kind, "search");
});
check("file: is rejected as a scheme", () => {
  assert.equal(parseInput("file:///etc/passwd", true).unsupportedProtocol, "file");
});

console.log("\nnormalizeUrl");
check("strips www and default port", () => {
  assert.equal(normalizeUrl("https://www.example.com:443/"), "https://example.com/");
});
check("preserves path and query", () => {
  assert.equal(normalizeUrl("https://a.com/b?c=1"), "https://a.com/b?c=1");
});
check("non-renderable input is returned untouched", () => {
  assert.equal(normalizeUrl("mailto:a@b.com"), "mailto:a@b.com");
});

console.log("\ndisplay helpers");
check("prettyUrl drops scheme and www", () => {
  assert.equal(prettyUrl("https://www.example.com/docs/"), "example.com/docs");
});
check("titleFromUrl uses the host for a bare origin", () => {
  assert.equal(titleFromUrl("https://www.example.com/"), "example.com");
});
check("titleFromUrl tidies a slug", () => {
  assert.equal(titleFromUrl("https://example.com/hello-world"), "Hello world");
});
check("isSecure reflects the protocol", () => {
  assert.equal(isSecure("https://a.com"), true);
  assert.equal(isSecure("http://a.com"), false);
});

console.log("\nblocking patterns");
check("wildcard matches subdomains", () => {
  assert.equal(matchesPattern("ads.tracker.net", "*.tracker.net"), true);
});
check("wildcard matches the bare domain", () => {
  assert.equal(matchesPattern("tracker.net", "*.tracker.net"), true);
});
check("plain pattern matches subdomains", () => {
  assert.equal(matchesPattern("a.doubleclick.net", "doubleclick.net"), true);
});
check("unrelated host does not match", () => {
  assert.equal(matchesPattern("example.com", "doubleclick.net"), false);
});

console.log("\nrule-pattern validation (isHostPattern)");
check("accepts plain and wildcard hosts", () => {
  assert.equal(isHostPattern("ads.example.com"), true);
  assert.equal(isHostPattern("*.example.com"), true);
});
check("accepts the shipped defaults", () => {
  for (const p of ["doubleclick.net", "adservice.google.com", "outbrain.com"]) {
    assert.equal(isHostPattern(p), true, p);
  }
});
check("rejects paths, schemes, ports and spaces", () => {
  for (const p of ["http://x.com", "example.com/path", "example.com:8080", "a b", "*", "javascript:alert(1)"]) {
    assert.equal(isHostPattern(p), false, p);
  }
});

console.log("\nsearch engines");
check("query is encoded into the template", () => {
  assert.equal(searchUrl("duckduckgo", "a b&c"), "https://duckduckgo.com/?q=a%20b%26c");
});
check("unknown engine falls back to the default", () => {
  assert.equal(getEngine("nope" as never).id, "duckduckgo");
});

console.log(`\n${pass} checks passed\n`);
