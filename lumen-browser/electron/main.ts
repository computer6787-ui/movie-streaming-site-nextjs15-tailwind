/**
 * Electron main process.
 *
 * Layering, matching the architecture the renderer already expects:
 *
 *   Existing Chitralipi UI (Next.js, unchanged)
 *      -> BrowserEngineAdapter ("chromium")
 *         -> IPC (preload)
 *            -> WebContentsView  <- the real Chromium renderer
 *               -> external website, with the guards attached
 *
 * The UI is NOT reimplemented. This process only provides the engine the
 * `BrowserEngineAdapter` interface already described: real navigation, real
 * titles, and a real request interceptor.
 */

import { app, BrowserWindow, ipcMain, shell, WebContentsView } from "electron";
import { appendFileSync } from "node:fs";
import path from "node:path";
import {
  installNetworkGuard,
  installPopupGuard,
  onDecision,
  getConfig,
  updateConfig,
} from "./guards";

/**
 * `__dirname` rather than `import.meta.url`: this file is bundled to CommonJS
 * for Electron, where `import.meta` is unavailable and would silently resolve
 * to undefined — a broken preload path at runtime rather than a build error.
 */
const dirname = __dirname;
const DEV_URL = process.env.LUMEN_DEV_SERVER_URL ?? "http://localhost:4310";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

let shellWindow: BrowserWindow | null = null;

/**
 * Windows GUI-subsystem Electron does not reliably flush stdout, so startup
 * facts go to a file as well. A silent window is otherwise indistinguishable
 * from a successful launch, which is exactly the false green worth avoiding.
 * Module scope because `createShell` reports through it too.
 */
function trace(line: string): void {
  console.log(line);
  try {
    appendFileSync(path.join(dirname, "..", "electron-startup.log"), line + "\n");
  } catch {
    /* logging must never break startup */
  }
}
/** tabId -> the live Chromium view backing it. */
const views = new Map<string, WebContentsView>();

function layout(view: WebContentsView, b: Bounds): void {
  view.setBounds({
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.max(0, Math.round(b.width)),
    height: Math.max(0, Math.round(b.height)),
  });
}

function viewFor(tabId: string): WebContentsView {
  const existing = views.get(tabId);
  if (existing) return existing;

  const view = new WebContentsView({
    webPreferences: {
      // The page is untrusted remote content: every Chromium guarantee stays on.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  installNetworkGuard(view.webContents.session);
  installPopupGuard(view.webContents, (popupUrl) => {
    // Ask the UI to open this as a real tab. It inherits the same session and
    // the same guards, so nothing escapes filtering.
    //
    // Note the target: the *shell* window is the renderer running the Chitralipi
    // UI, so events must be sent there, not to the page's own webContents.
    shellWindow?.webContents.send("tab:open-new", { url: popupUrl });
  });

  // Feed navigation/load state back to the UI, so tabs, titles and the
  // progress bar behave exactly as they do in the iframe build.
  const send = (state: unknown) => view.webContents.send("tab:state", state);
  view.webContents.on("page-title-updated", (_e, title) => send({ tabId, title }));
  view.webContents.on("page-favicon-updated", (_e, favicons) =>
    send({ tabId, favicon: favicons[0] }),
  );
  view.webContents.on("did-start-loading", () => send({ tabId, status: "loading" }));
  view.webContents.on("did-stop-loading", () => send({ tabId, status: "ready" }));
  view.webContents.on("did-navigate", (_e, url) => send({ tabId, url, status: "loading" }));
  view.webContents.on("did-navigate-in-page", (_e, url) =>
    send({ tabId, url, status: "ready" }),
  );
  view.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 === aborted by a new load
    send({ tabId, status: "error", error: { code, message: desc, url } });
  });

  views.set(tabId, view);
  return view;
}

function createShell(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    backgroundColor: "#0b0d10",
    webPreferences: {
      preload: path.join(dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the UI IMMEDIATELY, before waiting on anything. `ready-to-show` only
  // fires once the window has painted its first frame, so deferring the load
  // until inside that handler is a deadlock: the window waits for content that
  // is only being requested from inside the wait. The window stayed invisible
  // and the app looked hung.
  const url = app.isPackaged
    ? `file://${path.join(dirname, "..", "out", "index.html")}`
    : DEV_URL;
  void win.loadURL(url);

  win.once("ready-to-show", () => {
    win.show();
    trace(`[lumen] shell shown, url=${url}`);
  });

  // One-time startup self-check: the difference between "the process started"
  // and "the UI is actually up and talking to the engine". A preload path typo
  // leaves a window open and blank while every process-level check still looks
  // healthy, so assert the bridge and the real UI are both present. The
  // store's hydrate() runs behind a "Restoring your session" gate, so wait for
  // that gate to clear before declaring the UI up.
  void win.webContents
    .executeJavaScript(
      `new Promise((resolve) => {
         const iv = setInterval(() => {
           if (!/Restoring your session/.test(document.body.innerText)) {
             clearInterval(iv);
             resolve(JSON.stringify({
               bridge: typeof window.lumenNative === 'object' && window.lumenNative !== null,
               addressBar: !!document.querySelector('[aria-label="Address and search bar"]'),
               body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 100)
             }));
           }
         }, 100);
         setTimeout(() => { clearInterval(iv); resolve('{"error":"gate never cleared"}'); }, 10000);
       })`,
    )
    .then((ui) => trace(`[lumen] ui ${ui}`))
    .catch((err: Error) => trace(`[lumen] shell load failed: ${err.message}`));

  win.on("closed", () => {
    shellWindow = null;
    views.clear();
  });

  return win;
}

function registerIpc(): void {
  ipcMain.handle("engine:available", () => true);

  ipcMain.handle("tab:attach", (event, tabId: string, bounds: Bounds) => {
    const view = viewFor(tabId);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.contentView.addChildView(view);
    layout(view, bounds);
    return { viewId: tabId };
  });

  ipcMain.handle("tab:load", (_e, tabId: string, url: string) => {
    const view = viewFor(tabId);
    void view.webContents.loadURL(url).catch((err: Error) => {
      trace(`[BLOCK NAVIGATION] ${url} (load failed: ${err.message})`);
    });
  });

  ipcMain.handle("tab:go-back", (_e, tabId: string) => {
    const nav = views.get(tabId)?.webContents.navigationHistory;
    if (nav?.canGoBack()) nav.goBack();
  });
  ipcMain.handle("tab:go-forward", (_e, tabId: string) => {
    const nav = views.get(tabId)?.webContents.navigationHistory;
    if (nav?.canGoForward()) nav.goForward();
  });
  ipcMain.handle("tab:reload", (_e, tabId: string) => {
    views.get(tabId)?.webContents.reload();
  });
  ipcMain.handle("tab:stop", (_e, tabId: string) => {
    views.get(tabId)?.webContents.stop();
  });

  ipcMain.handle("tab:set-bounds", (_e, tabId: string, bounds: Bounds) => {
    const view = views.get(tabId);
    if (view) layout(view, bounds);
  });

  ipcMain.handle("tab:destroy", (_e, tabId: string) => {
    const view = views.get(tabId);
    if (!view) return;
    shellWindow?.contentView.removeChildView(view);
    view.webContents.close();
    views.delete(tabId);
  });

  ipcMain.handle("guard:config:get", () => getConfig());
  ipcMain.handle("guard:config:set", (_e, next) => updateConfig(next));

  // The same escape hatch the iframe build has: open in the real OS browser.
  ipcMain.handle("shell:open-external", (_e, url: string) => {
    void shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  trace(`[lumen] app ready (main=${__filename}, packaged=${app.isPackaged})`);

  // Attach to the default session BEFORE any view exists, so no request can
  // slip through un-intercepted during startup.
  installNetworkGuard();

  registerIpc();
  onDecision((entry) => {
    // Mirror the main-process audit trail into the renderer console, where the
    // [ALLOW]/[BLOCK] lines are actually read.
    shellWindow?.webContents.send("guard:decision", entry);
  });

  shellWindow = createShell();
  trace(`[lumen] shell created, visible=${shellWindow.isVisible()}`);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) shellWindow = createShell();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
