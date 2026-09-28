/**
 * Dev-only visual check. Screenshots the redesigned routes at desktop and
 * mobile widths so the layout can be eyeballed without a manual pass.
 *
 *   node scripts/capture.cjs [--port 3111] [--out .capture]
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
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const PORT = argOf("--port", "3111");
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve(argOf("--out", ".capture"));

// [name, path, waitFor] -- the watch routes stall on the third-party iframe,
// so they are captured by a timeout rather than networkidle.
const ROUTES = [
  ["home", "/", "networkidle"],
  ["browse-movies", "/browse?type=movie", "networkidle"],
  ["search", "/search?q=matrix", "networkidle"],
  ["movie", "/movie/603", "networkidle"],
  ["tv", "/tv/1399", "networkidle"],
  ["watch-movie", "/watch/movie/603", "timeout"],
  ["watch-tv", "/watch/tv/1399/1/2", "timeout"],
  ["adblock", "/adblock", "networkidle"],
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
];

const only = argOf("--only", null);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // Prefer the full Chromium build over the headless shell: it is the same
  // engine the browser ships, so the screenshots match what a user sees.
  // Falls back to the default headless shell if it is not downloaded.
  let browser;
  try {
    browser = await chromium.launch({ channel: "chromium" });
  } catch {
    browser = await chromium.launch();
  }

  const errors = [];

  for (const [vpName, viewport] of VIEWPORTS) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      isMobile: vpName === "mobile",
      hasTouch: vpName === "mobile",
    });

    for (const [name, route, mode] of ROUTES) {
      if (only && !name.includes(only)) continue;
      const page = await context.newPage();

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(`[${vpName}/${name}] console: ${msg.text()}`);
        }
      });
      page.on("pageerror", (err) => {
        errors.push(`[${vpName}/${name}] pageerror: ${err.message}`);
      });

      const url = `${BASE}${route}`;
      try {
        await page.goto(url, {
          waitUntil: mode === "timeout" ? "commit" : mode,
          timeout: 45000,
        });
        // Let hydration, reveal observers and image decoding settle.
        await page.waitForTimeout(mode === "timeout" ? 3000 : 2500);
        const file = path.join(OUT, `${vpName}-${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`ok   ${vpName.padEnd(7)} ${route.padEnd(26)} -> ${path.relative(process.cwd(), file)}`);
      } catch (err) {
        errors.push(`[${vpName}/${name}] ${route}: ${err.message}`);
        console.log(`FAIL ${vpName.padEnd(7)} ${route.padEnd(26)} ${err.message}`);
      }
      await page.close();
    }
    await context.close();
  }

  await browser.close();

  if (errors.length) {
    console.log(`\n${errors.length} problem(s):`);
    for (const e of errors) console.log(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("\nNo console errors, page errors, or navigation failures.");
  }
})();