/**
 * Active-state check across every route, at desktop and mobile.
 *
 * check-header.cjs only loads "/", so the pathname-based active states on the
 * browse / detail / watch routes go unverified. This asserts, per route, which
 * switcher entry carries aria-current="page" -- and on mobile, that the drawer
 * sheet agrees with the bar and opens/closes cleanly.
 *
 *   node scripts/check-active.cjs [--port 3111]
 */
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const argOf = (f, d) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};
const BASE = "http://localhost:" + argOf("--port", "3111");

// [route, expected label in the switcher]. null = nothing should light up.
const ROUTES = [
  ["/", "All"],
  ["/browse/movie", "Movies"],
  ["/browse/tv", "Series"],
  ["/movie/603", "Movies"],
  ["/tv/1399", "Series"],
  ["/watch/movie/603", "Movies"],
  ["/watch/tv/1399/1/2", "Series"],
  ["/search?q=matrix", null],
  ["/adblock", null],
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

// Runs in the page. Returns which switcher entries are marked current, for
// both the desktop bar nav and the mobile drawer nav.
function readActiveStates() {
  function marked(nav) {
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('a[aria-current="page"]')).map(function (a) {
      return a.textContent.trim();
    });
  }
  var bar = document.querySelector("header nav");
  var sheet = document.querySelector('nav[aria-label="Mobile"]');
  return {
    barVisible: !!bar && bar.getBoundingClientRect().width > 0,
    bar: marked(bar),
    sheet: marked(sheet),
  };
}

// Runs in the page. Reports drawer open/closed state and the scroll lock.
function readDrawerState() {
  var sheet = document.querySelector('nav[aria-label="Mobile"]');
  // The aria-hidden flag lives on the outer fixed container, not on the panel
  // div that wraps the nav, so match on the attribute rather than the tag.
  var host = sheet ? sheet.closest("[aria-hidden]") : null;
  var r = sheet ? sheet.getBoundingClientRect() : null;
  return {
    open: !!host && host.getAttribute("aria-hidden") === "false",
    visible: !!r && r.height > 0 && r.width > 0,
    locked: document.body.style.overflow === "hidden",
  };
}

(async function () {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chromium" });
  } catch (e) {
    browser = await chromium.launch();
  }

  const failures = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    for (const route of ROUTES) {
      const expected = route[1];
      const path = route[0];
      const page = await context.newPage();

      await page.goto(BASE + path, {
        waitUntil: vp.isMobile ? "commit" : "networkidle",
        timeout: 45000,
      });
      await page.waitForTimeout(vp.isMobile ? 2000 : 900);

      const state = await page.evaluate(readActiveStates);
      // On mobile the bar nav is hidden, so the drawer is the visible switcher.
      const observed = state.barVisible ? state.bar : state.sheet;

      if (expected === null) {
        if (observed.length > 0) {
          failures.push(vp.name + " " + path + ": expected no active entry, got [" + observed.join(" ") + "]");
        }
      } else if (observed.length !== 1 || observed[0] !== expected) {
        failures.push(vp.name + " " + path + ": expected [" + expected + "], got [" + observed.join(" ") + "]");
      }

      if (vp.isMobile) {
        const menu = page.locator('button[aria-label="Open menu"]');
        if (await menu.isVisible()) {
          await menu.click();
          await page.waitForTimeout(450);
          const opened = await page.evaluate(readDrawerState);
          if (!opened.open || !opened.visible) {
            failures.push(vp.name + " " + path + ": drawer did not open visibly");
          }
          if (!opened.locked) {
            failures.push(vp.name + " " + path + ": body scroll not locked with drawer open");
          }
          await page.keyboard.press("Escape");
          await page.waitForTimeout(450);
          const closed = await page.evaluate(readDrawerState);
          if (closed.open) {
            failures.push(vp.name + " " + path + ": Escape did not close drawer");
          }
          if (closed.locked) {
            failures.push(vp.name + " " + path + ": body scroll still locked after close");
          }
        } else {
          failures.push(vp.name + " " + path + ": menu button not visible on mobile");
        }
      }

      const want = expected === null ? "-" : expected;
      console.log(
        vp.name.padEnd(7) + " " + path.padEnd(24) +
          " expected=[" + want + "]" +
          "  bar=[" + state.bar.join(" ") + "]" +
          "  sheet=[" + state.sheet.join(" ") + "]"
      );
      await page.close();
    }
    await context.close();
  }

  await browser.close();

  if (failures.length) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log("  - " + f);
    process.exitCode = 1;
  } else {
    console.log("\nActive states correct on every route; mobile drawer opens and closes cleanly.");
  }
})();
