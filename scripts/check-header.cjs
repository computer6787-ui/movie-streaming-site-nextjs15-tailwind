/**
 * Header geometry check. The bug: SearchForm rendered a second line of type
 * pills inside a fixed-height nav bar, so the row overflowed and sat half
 * inside / half outside the header.
 *
 *   node scripts/check-header.cjs [--port 3111]
 */
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const argOf = (f, d) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};
const BASE = `http://localhost:${argOf("--port", "3111")}`;

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chromium" });
  } catch {
    browser = await chromium.launch();
  }

  const failures = [];

  for (const width of [1440, 1280, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(800);

    const m = await page.evaluate(() => {
      const header = document.querySelector("header");
      const bar = header?.querySelector("div");
      const form = header?.querySelector("form");
      const search = header?.querySelector('input[type="search"]');
      const nav = header?.querySelector("nav");
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      return {
        header: r(header),
        bar: r(bar),
        form: r(form),
        search: r(search),
        nav: r(nav),
        typeGroups: header
          ? header.querySelectorAll('[aria-label="Filter results by type"]').length
          : -1,
        // Only the switcher links. The nav also holds the mobile search icon
        // link and the menu button, which are not part of the type axis.
        navLabels: nav
          ? [...nav.querySelectorAll("a")]
              .filter((a) => a.getAttribute("aria-label") !== "Search")
              .map((a) => a.textContent.trim())
          : [],
        current: nav
          ? [...nav.querySelectorAll('a[aria-current="page"]')].map((a) => a.textContent.trim())
          : [],
      };
    });

    const tag = `${String(width).padStart(4)}px`;
    const barH = m.bar ? Math.round(m.bar.height) : 0;
    const headerH = m.header ? Math.round(m.header.height) : 0;
    const formH = m.form ? Math.round(m.form.height) : 0;

    // The bar is the fixed-height row; the form must never exceed it.
    const formFits = formH <= barH + 1;
    const searchInside =
      m.search && m.header
        ? m.search.top >= m.header.top - 0.5 &&
          m.search.bottom <= m.header.bottom + 0.5
        : false;
    const noTabs = m.typeGroups === 0;

    console.log(
      `${tag}  bar=${String(barH).padStart(3)}  header=${String(headerH).padStart(3)}  form=${String(formH).padStart(3)}  ` +
        `nav=[${m.navLabels.join(" ")}]  current=[${m.current.join(" ")}]  ` +
        `formFits=${formFits}  searchInside=${searchInside}  noTabs=${noTabs}`
    );

    if (width >= 768) {
      if (!formFits) failures.push(`${tag}: form (${formH}px) overflows bar (${barH}px)`);
      if (!noTabs) failures.push(`${tag}: type tab group still in header`);
      if (m.navLabels.join("|") !== "All|Movies|Series")
        failures.push(`${tag}: nav should be All/Movies/Series, got [${m.navLabels.join(" ")}]`);
      if (m.current.length !== 1)
        failures.push(`${tag}: expected exactly 1 current nav link, got ${m.current.length}`);
    }
    if (!searchInside) failures.push(`${tag}: search input escapes the header box`);

    await page.close();
  }

  await browser.close();

  if (failures.length) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("\nHeader clean at every width: no overflow, no stray tabs, one switcher.");
  }
})();