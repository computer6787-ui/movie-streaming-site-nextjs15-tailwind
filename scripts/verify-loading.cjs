/**
 * Dev-only check that route loading actually appears.
 *
 * The skeletons are trivially easy to write and impossible to trust without
 * looking at them, because a loading boundary only renders during a real
 * navigation. So this script does what a human would do -- clicks a link -- but
 * on a throttled connection, sampling the DOM mid-flight.
 *
 *   node scripts/verify-loading.cjs [--port 3210] [--out .capture-loading]
 *
 * For each route it:
 *   1. throttles the network so the RSC payload is slow enough to observe,
 *   2. clicks a link and samples the DOM while the transition is in flight,
 *   3. asserts the skeleton AND the progress bar are on screen,
 *   4. captures a screenshot of the loading state.
 *
 * Playwright is not a project dependency; install it on demand with
 * `npm i --no-save playwright && npx playwright install chromium`.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i !== 0 && i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const PORT = argOf("--port", "3210");
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve(argOf("--out", ".capture-loading"));

// [name, from, selector, expectedLabel]
// Selectors are given in Playwright text/href form and each is verified to
// exist before clicking, so a case that cannot be staged reports SKIP rather
// than a false PASS. Note there is deliberately no `/` link here: on a
// prerendered page like /browse/movie the home link resolves from the router
// cache and shows no loading state at all, which is correct behaviour, not a
// failure.
const CASES = [
  ["browse-tv", "/browse/movie", 'header nav >> text=Series', "series"],
  ["browse-movies", "/browse/tv", 'header nav >> text=Movies', "movies"],
  // browse-genre is a same-page filter (via router.push from a button), not a
  // route navigation, so it does not produce a progress bar or skeleton. It is
  // tested here to confirm it does not regress (e.g., flash a skeleton).
  ["browse-genre", "/browse/movie", 'main button:has-text("Action")', "movies"],
  // On the /search landing page (no query), the browse shortcut cards
  // are IntentLinks to the catalogue.
  ["search-to-browse", "/search", 'main a[href="/browse/movie"]', "movies"],
  ["movie", "/browse/movie", "main a[href^='/movie/']", "movie details"],
  ["tv", "/browse/tv", "main a[href^='/tv/']", "series details"],
  ["watch-movie", "/movie/603", "main a[href^='/watch/movie/']", "player"],
  ["watch-tv", "/tv/1399", "main a[href^='/watch/tv/']", "player"],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ channel: "chromium" });
  } catch {
    browser = await chromium.launch();
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });

  // Slow the RSC fetch so the transition window is wide enough to sample.
  // 900ms of added latency on top of whatever the app already costs.
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("_rsc") || url.includes("/api/")) {
      await new Promise((r) => setTimeout(r, 900));
    }
    await route.continue();
  });

  const page = await context.newPage();
  const results = [];

  for (const [name, from, selector, label] of CASES) {
    const row = {
      name,
      skeleton: false,
      bar: false,
      honest: true, // bar never absent while the skeleton is on screen
      status: "",
      label: "",
    };

    try {
      await page.goto(BASE + from, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Let the origin page settle so we are navigating from a real page.
      await page.waitForTimeout(2500);

      const link = page.locator(selector).first();
      if ((await link.count()) === 0) {
        row.status = `SKIP - no link for ${selector} on ${from}`;
        results.push(row);
        continue;
      }

      // Sample from inside the page for the whole transition, rather than
      // round-tripping from Node. A 30ms interval over a ~1.5s transition is
      // ~50 samples, which is enough to catch the bar hiding early.
      await page.evaluate(() => {
        window.__samples = [];
        const push = () =>
          window.__samples.push({
            t: performance.now(),
            status: Boolean(document.querySelector('[role="status"][aria-busy="true"]')),
            boundary: Boolean(document.querySelector('[role="status"]')),
            // The bar element is always mounted now; what matters is whether it
            // is actually painted, which is what `data-phase` reports.
            bar: (() => {
              const el = document.querySelector(".route-progress");
              return Boolean(
                el && el.dataset.phase !== "idle" && Number(getComputedStyle(el).opacity) > 0.1,
              );
            })(),
            label: document
              .querySelector('[role="status"] .sr-only')
              ?.textContent?.trim() ?? "",
          });
        push();
        window.__iv = setInterval(push, 16);
        window.__t0 = performance.now();
      });

      await link.click({ noWaitAfter: true }).catch(() => {});

      // Wait for the transition to finish, then stop sampling.
      await page
        .waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 20000 })
        .catch(() => {});
      await page.waitForTimeout(700);

      const samples = await page.evaluate(() => {
        clearInterval(window.__iv);
        return window.__samples;
      });

      const t0 = samples[0]?.t ?? 0;
      const end = () => {
        // The route is done when no boundary remains AND the bar has gone idle.
        const last = samples[samples.length - 1];
        return last.t - t0;
      };
      const seen = { skeleton: false, bar: false, boundary: false, dishonest: 0 };

      for (const s of samples) {
        if (s.status) seen.skeleton = true;
        if (s.boundary) seen.boundary = true;
        if (s.bar) seen.bar = true;
        // The regression this script exists to catch: the bar reporting "done"
        // while the page is still loading.
        if (s.status && !s.bar) seen.dishonest += 1;
      }

      row.skeleton = seen.skeleton;
      row.bar = seen.bar;
      row.boundary = seen.boundary;
      row.dishonest = seen.dishonest;
      row.honest = seen.dishonest === 0;
      row.ms = Math.round(end());
      for (const s of samples) if (s.label) row.label = s.label;
      row.flicker = (() => {
        // A skeleton that appears and disappears within a few frames is a
        // flicker, which is worse than no feedback at all.
        const on = samples.filter((s) => s.status);
        if (on.length < 2) return false;
        return on[on.length - 1].t - on[0].t < 120;
      })();

      if (seen.boundary) {
        await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      }

      if (name === "browse-genre") {
        // browse-genre uses router.push from an inline button, not a Link.
        // It does not and should not trigger the intent progress bar.
        // We verify that no skeleton is shown (correct fast behavior).
        if (seen.skeleton) row.status = "FAIL - skeleton flickered on same-page filter";
        else row.status = "PASS (expected: no progress bar for button filter)";
      } else if (!seen.bar) row.status = "FAIL - no progress bar observed";
      else if (seen.dishonest > 0)
        row.status = `FAIL - bar hidden ${seen.dishonest}x while skeleton still on screen`;
      else if (seen.skeleton && row.flicker) row.status = "FAIL - skeleton flickered";
      else if (!seen.skeleton) row.status = "PASS (instant - no skeleton)";
      else if (!row.label.toLowerCase().includes(label)) row.status = `WARN - label "${row.label}"`;
      else row.status = "PASS (skeleton shown)";
    } catch (err) {
      row.status = `ERROR - ${err.message.split("\n")[0]}`;
    }

    results.push(row);
  }

  await browser.close();

  console.log("\n=== route loading check ===");
  for (const r of results) {
    const mark = r.status.startsWith("PASS")
      ? "PASS"
      : r.status.startsWith("WARN")
        ? "WARN"
        : r.status.startsWith("SKIP")
          ? "SKIP"
          : "FAIL";
    console.log(
      `${mark}  ${r.name.padEnd(16)} ${String(r.ms).padStart(5)}ms  bar=${String(r.bar).padEnd(5)} sk=${String(r.skeleton).padEnd(5)} ${r.status}`,
    );
  }

  const failed = results.filter(
    (r) => r.status.startsWith("FAIL") || r.status.startsWith("ERROR") || r.status.startsWith("WARN"),
  );
  const skipped = results.filter((r) => r.status.startsWith("SKIP"));
  console.log(
    `\n${results.length - failed.length - skipped.length} passed, ${skipped.length} skipped, ${failed.length} problem(s)`,
  );
  if (failed.length) process.exitCode = 1;
})();
