/**
 * Dev-only diagnostic: what does the DOM actually look like during a
 * transition, and *when*? Prints a timeline of pathname, the status wrapper and
 * the progress bar so the loading signal can be reasoned about instead of
 * guessed at.
 *
 *   node scripts/debug-nav.cjs --port 3210
 */
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i !== 0 && i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PORT = argOf("--port", "3210");
const BASE = `http://localhost:${PORT}`;

const FROM = argOf("--from", "/browse/movie");
// Playwright selector syntax (`text=`) is fine here because this value never
// passes through a shell. The default targets the "Series" switcher entry,
// which is a real client-side navigation rather than a same-page anchor.
const SELECTOR = argOf("--sel", "header nav >> text=Series");

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chromium" });
  } catch {
    browser = await chromium.launch();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  await context.route("**/*", async (route) => {
    const u = route.request().url();
    if (u.includes("_rsc") || u.includes("/api/")) await new Promise((r) => setTimeout(r, 900));
    await route.continue();
  });

  const page = await context.newPage();

  // Any document-level navigation means the click was NOT handled by the
  // client router, which changes what we are looking for entirely.
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) console.log(`  [doc-nav] ${f.url()}`);
  });
  page.on("console", (m) => {
    if (m.text().startsWith("[nav]")) console.log(`  browser: ${m.text()}`);
  });

  await page.goto(BASE + FROM, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const link = page.locator(SELECTOR).first();
  console.log(`clicking ${SELECTOR} on ${FROM} (count=${await link.count()})`);
  console.log(`  href = ${await link.getAttribute("href").catch(() => "?")}`);

  // Log from inside the page so we see the same values the components see.
  await page.evaluate(() => {
    window.__timeline = [];
    const t0 = performance.now();
    const push = () =>
      window.__timeline.push({
        t: Math.round(performance.now() - t0),
        path: location.pathname + location.search,
        status: Boolean(document.querySelector('[role="status"][aria-busy="true"]')),
        bar: Boolean(document.querySelector(".route-progress")),
      });
    push();
    window.__iv = setInterval(push, 30);
  });

  await link.click({ noWaitAfter: true }).catch((e) => console.log("click err:", e.message));
  await page.waitForTimeout(3500);

  const raw = await page
    .evaluate(() => {
      clearInterval(window.__iv);
      return window.__timeline;
    })
    .catch(() => null);

  if (!raw) {
    console.log("\n  window.__timeline unreachable -- the document was replaced.");
  } else {
    console.log(`\n  raw frames sampled: ${raw.length}`);
    // Collapse consecutive identical frames so the timeline is readable.
    const rows = [];
    for (const r of raw) {
      const prev = rows[rows.length - 1];
      if (prev && prev.path === r.path && prev.status === r.status && prev.bar === r.bar) continue;
      rows.push(r);
    }
    console.log("\n   t(ms)  path                          skeleton  bar");
    for (const r of rows) {
      console.log(
        `  ${String(r.t).padStart(6)}  ${r.path.padEnd(28)}  ${String(r.status).padEnd(8)}  ${r.bar}`,
      );
    }
  }

  await browser.close();
})();
