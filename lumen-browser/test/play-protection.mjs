/**
 * THE CRITICAL TEST.
 *
 * Drives a real Chromium (Electron) against the fixture streaming site and
 * verifies the actual reported scenario:
 *
 *   USER CLICKS PLAY
 *     -> video genuinely starts playing
 *     -> the unwanted ad popup does NOT appear
 *     -> the forced ad redirect does NOT happen
 *     -> normal site resources, scripts, fetch and XHR still work
 *     -> a legitimate window.open still works
 *
 * Everything is asserted against real observable state: playback comes from
 * `video.currentTime` actually advancing, and the popup/redirect checks come
 * from Chromium refusing to create the window or perform the navigation.
 *
 * Run:  node test/play-protection.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const require_ = createRequire(import.meta.url);
const electronPath = require_("electron");

const FIXTURE_PORT = 4311;
const SITE = `http://localhost:${FIXTURE_PORT}`;

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

async function main() {
  // ------------------------------------------------------------ fixture site
  // Refuse to run against a stale server: a leftover process holding the port
  // would serve OLD fixture code, and the test would then "pass" or "fail"
  // against something that is no longer the file on disk. That is worse than
  // a crash, so we detect it explicitly.
  try {
    const probe = await fetch(`${SITE}/watch`, { signal: AbortSignal.timeout(1500) });
    if (probe.ok) {
      const body = await probe.text();
      if (body.includes("/media/mp4.mp4")) {
        console.error(
          `Port ${FIXTURE_PORT} is already serving a current fixture. ` +
            `Stop it first (it may be an orphaned test server).`,
        );
        process.exit(1);
      }
      console.error(
        `Port ${FIXTURE_PORT} is held by a STALE fixture server. Stop it and re-run.`,
      );
      process.exit(1);
    }
  } catch {
    /* nothing listening — the normal case */
  }

  const site = spawn(process.execPath, [path.join(here, "serve-fixture.mjs")], {
    env: { ...process.env, FIXTURE_PORT: String(FIXTURE_PORT) },
    stdio: "ignore",
  });
  if (!(await waitFor(`${SITE}/watch`))) {
    console.error("fixture server never came up");
    process.exit(1);
  }

  // ---------------------------------------------------------------- electron
  const electron = spawn(electronPath, [path.join(root, "electron", "harness.cjs")], {
    cwd: root,
    env: { ...process.env, LUMEN_HARNESS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let out = "";
  electron.stdout.on("data", (d) => (out += d.toString()));
  electron.stderr.on("data", (d) => (out += d.toString()));

  const cleanup = () => {
    try { electron.kill(); } catch {}
    try { site.kill(); } catch {}
  };
  process.on("exit", cleanup);

  // The harness reports one JSON line when every scenario has finished.
  const deadline = Date.now() + 90_000;
  let result = null;
  while (Date.now() < deadline) {
    const line = out.split("\n").find((l) => l.startsWith("HARNESS_RESULT "));
    if (line) {
      try {
        result = JSON.parse(line.slice("HARNESS_RESULT ".length));
        break;
      } catch {
        /* partial line; wait */
      }
    }
    await sleep(300);
  }

  electron.kill();
  site.kill();

  if (!result) {
    console.error("\nHarness never reported a result. Output:\n" + out);
    process.exit(1);
  }

  // ------------------------------------------------------------- assertions
  console.log("\nUSER CLICKS PLAY");

  check("video actually starts playing", result.playState === "playing", `state="${result.playState}"`);
  check(
    "playback time advances (real decoding)",
    result.currentTime > 0.3,
    `currentTime=${result.currentTime?.toFixed?.(2)}s`,
  );
  check("video reports a real duration", result.duration > 0, `duration=${result.duration}s`);
  check("no media errors", !result.mediaError, result.mediaError ? `err=${result.mediaError}` : "");

  console.log("\nad popup / redirect must be prevented");
  check("no ad popup window was created", result.windowsOpened === 0, `windows opened=${result.windowsOpened}`);
  check("ad popup URL never loaded", !result.openedUrls.some((u) => /doubleclick|taboola/.test(u)),
    JSON.stringify(result.openedUrls));
  check("page was NOT navigated away to the ad host", !/doubleclick|taboola/.test(result.finalUrl),
    `finalUrl=${result.finalUrl}`);
  check("page is still on the original stream page", result.finalUrl.startsWith(`${SITE}/watch`));
  check("engine logged a real popup block", result.blockedPopups.length > 0,
    result.blockedPopups.join(" | "));
  check("engine logged the ad URL as blocked", result.blockedAll.some((u) => /doubleclick|taboola/.test(u)));

  console.log("\nlegitimate behaviour must survive");
  check("legitimate window.open still works", result.legitPopupWorked === true);
  check("page JS ran", result.pageScriptRan === true);
  check("fetch/XHR still works", result.fetchWorked === true);
  check("WebSocket not blocked", result.wsBlocked === false);

  console.log("\nnetwork filtering");
  check("ad-domain request was blocked at the network layer", result.blockedAll.some((u) => /doubleclick/.test(u)));
  check("tracking pixel was blocked", result.blockedAll.some((u) => /pixel|track/.test(u)));
  check("the MP4 itself was allowed", result.blockedAll.every((u) => !/\.mp4/.test(u)));
  check("allow lines were emitted too (not just blocks)", result.allowedCount > 0,
    `allowed=${result.allowedCount}`);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
