/**
 * End-to-end check of the REAL desktop app against REAL websites.
 *
 * Launches the actual built main.cjs and reports only what Electron actually
 * did. No fixture server, no mocks, and no changes to the app itself: we attach
 * over the DevTools protocol and drive the Chitralipi UI the way a user does, so
 * the whole real chain runs -- store -> adapter -> preload IPC -> WebContentsView
 * -> real network -> guards.
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const electronBin = path.join(root, "node_modules", "electron", "dist", "electron.exe");
const logFile = path.join(root, "electron-startup.log");
const CDP_PORT = 9222;
const NAV = "http://localhost:4310";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readLog = () => (existsSync(logFile) ? readFileSync(logFile, "utf8") : "");

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
  }
};

/** Minimal CDP client: just enough to evaluate JS in the shell renderer. */
function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    const p = msg.id && pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
  };
  const ready = new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("websocket failed"));
  });
  return {
    ready,
    close: () => ws.close(),
    async evaluate(expression) {
      await ready;
      const r = await new Promise((resolve, reject) => {
        const msgId = ++id;
        pending.set(msgId, { resolve, reject });
        ws.send(
          JSON.stringify({
            id: msgId,
            method: "Runtime.evaluate",
            params: { expression, returnByValue: true, awaitPromise: true },
          }),
        );
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result?.value;
    },
  };
}

async function attach() {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).catch(() => null);
    if (res?.ok) {
      const targets = await res.json();
      // The app exposes MORE than one page target: the Chitralipi shell, plus a
      // WebContentsView per open tab. Attaching to whichever came first picked
      // up a restored tab and reported a false "no bridge / no address bar".
      // Pin to the shell by its dev-server origin.
      const shell = targets.find(
        (t) => t.type === "page" && t.webSocketDebuggerUrl && t.url.startsWith(NAV),
      );
      if (shell) return shell;
    }
    await sleep(1000);
  }
  throw new Error("could not attach to the shell over CDP");
}

/** Wait for a page target whose URL is on `site` and report what it is showing. */
async function targetFor(site) {
  const host = new URL(site).host;
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).catch(() => null);
    if (res?.ok) {
      const hit = (await res.json()).find(
        (t) => t.type === "page" && t.url.includes(host) && t.url !== NAV,
      );
      if (hit) return { url: hit.url, title: hit.title || "" };
    }
    await sleep(1000);
  }
  return { url: "", title: "" };
}

async function main() {
  if (!existsSync(electronBin)) {
    console.error("electron binary missing");
    process.exit(1);
  }
  if (existsSync(logFile)) rmSync(logFile);

  const child = spawn(electronBin, [root, `--remote-debugging-port=${CDP_PORT}`], {
    cwd: root,
    env: { ...process.env, LUMEN_DEV_SERVER_URL: NAV },
    stdio: "ignore",
  });
  const cleanup = () => {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  };
  process.on("exit", cleanup);

  console.log("\n[1] app boots");
  let booted = false;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    if (/\[lumen\] ui \{/.test(readLog())) {
      booted = true;
      break;
    }
  }
  if (!booted) {
    console.error("app never booted. log tail:\n" + readLog().slice(-800));
    cleanup();
    process.exit(1);
  }
  const boot = readLog();
  check("window shown", /\[lumen\] shell shown/.test(boot));
  check("preload bridge attached", /"bridge":true/.test(boot));
  check("address bar rendered", /"addressBar":true/.test(boot));

  const cdp = connect((await attach()).webSocketDebuggerUrl);

  console.log("\n[2] native view is really attached");
  const info = await cdp.evaluate(
    `JSON.stringify({ bridge: !!window.lumenNative, keys: window.lumenNative ? Object.keys(window.lumenNative).length : 0 })`,
  );
  check("renderer bridge present", /"bridge":true/.test(info || ""), String(info));

  console.log("\n[3] loading real websites through the native view");
  for (const site of ["https://example.com", "https://news.ycombinator.com"]) {
    // Type, then let React actually process the keystroke, THEN press Enter.
    // AddressBar.commit() closes over component state, so dispatching both
    // events in one tick would submit the pre-typing value -- a test artifact,
    // not a browser bug.
    const typed = await cdp.evaluate(
      `(() => {
         const el = document.querySelector('[aria-label="Address and search bar"]');
         if (!el) return 'no address bar';
         el.focus();
         const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
         setter.call(el, '');
         for (const ch of ${JSON.stringify(site)}) {
           setter.call(el, el.value + ch);
           el.dispatchEvent(new Event('input', { bubbles: true }));
         }
         return el.value;
       })()`,
    );
    check(`${site} typed into address bar`, typed === site, String(typed));

    await sleep(400);
    const submitted = await cdp.evaluate(
      `(() => {
         const el = document.querySelector('[aria-label="Address and search bar"]');
         el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
         return 'enter';
       })()`,
    );
    check(`${site} submitted via address bar`, submitted === "enter", String(submitted));

    await sleep(9000);
    const log = readLog();
    check(
      `${site} top-level document allowed`,
      log.includes(`[ALLOW] ${site}/`),
      "no ALLOW for the document",
    );

    // Stronger evidence than log counting: a separate Chromium renderer for the
    // site now exists, proving a real WebContentsView is displaying it. Log
    // lines alone would be satisfied by an ALLOW for a request that never
    // finished, and are skipped entirely when the response is served from cache.
    const live = await targetFor(site);
    check(
      `${site} rendered by a real Chromium view`,
      live.title.length > 0,
      `title=${JSON.stringify(live.title)} url=${live.url}`,
    );
  }

  console.log("\n[4] nothing important was blocked");
  const log = readLog();
  const blocks = log.split("\n").filter((l) => l.startsWith("[BLOCK]"));
  console.log(
    blocks.length
      ? `  ${blocks.length} blocked, e.g. ${blocks[0].slice(0, 110)}`
      : "  (0 blocked on these benign sites -- correct)",
  );
  check(
    "no media or script was blocked",
    !/\[BLOCK\].*\.(mp4|webm|m4s|ts|js)\b/i.test(log),
    "a media/script asset was blocked",
  );

  console.log("\n[5] summary");
  console.log(`  ${pass} passed, ${fail} failed`);
  cdp.close();
  await sleep(500);
  cleanup();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
