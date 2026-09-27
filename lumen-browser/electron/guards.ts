/**
 * The native guards — the only place in the codebase allowed to claim that
 * something was actually blocked.
 *
 * Two hard rules govern everything below:
 *
 *   1. A `[BLOCK]` line is emitted ONLY when Chromium has truly prevented the
 *      request/window/navigation. If we cancel it, it is blocked. If we do
 *      not, nothing is logged as blocked. There are no synthetic counters.
 *   2. We never weaken Chromium. No `webSecurity: false`, no proxy, no
 *      user-agent spoofing to defeat bot checks, no attempt to route around
 *      X-Frame-Options, CSP or CORS. Sites that refuse us get refused.
 */

import { session, type WebContents, type WebRequest } from "electron";
import { appendFileSync } from "node:fs";
import path from "node:path";
import {
  decideNavigation,
  decidePopup,
  decideRequest,
  type Decision,
  type FilterConfig,
} from "./filterlist";

/**
 * Append to the same audit file `main.ts` uses.
 *
 * Windows GUI-subsystem Electron does not reliably flush stdout, and a launch
 * that redirects stdio (CI, a harness, `stdio: "ignore"`) discards it entirely.
 * The audit trail is the single source of truth for "did this actually get
 * blocked", so it must not depend on a stream the platform may drop.
 */
function trace(line: string): void {
  console.log(line);
  try {
    appendFileSync(path.join(__dirname, "..", "electron-startup.log"), line + "\n");
  } catch {
    /* logging must never break the guard */
  }
}

export type DecisionLog = {
  id: string;
  level: "allow" | "block";
  /** "REQUEST" | "POPUP" | "NAVIGATION" */
  surface: string;
  url: string;
  reason: string;
  pattern?: string;
  resourceType?: string;
  /** Epoch ms, so the renderer can order events it receives out of band. */
  at: number;
};

type Listener = (entry: DecisionLog) => void;
const listeners = new Set<Listener>();

export function onDecision(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(entry: Omit<DecisionLog, "id" | "at">): DecisionLog {
  const full: DecisionLog = { ...entry, id: `d${Date.now()}${counter++}`, at: Date.now() };
  for (const cb of listeners) {
    try {
      cb(full);
    } catch {
      /* a broken listener must not take down the guard */
    }
  }
  // Mirror to the log file as well as the terminal so the main process log is a
  // real audit trail even when stdout is not delivered.
  const tag = full.level === "block" ? "BLOCK" : "ALLOW";
  const extra = full.surface !== "REQUEST" ? ` ${full.surface}` : "";
  const rule = full.pattern ? ` (${full.reason}: ${full.pattern})` : ` (${full.reason})`;
  trace(`[${tag}]${extra} ${full.url}${rule}`);
  return full;
}

let counter = 0;

/** Config the renderer can push down; defaults are permissive-but-protected. */
const config: FilterConfig = {
  enabled: true,
  allowlist: [],
  blocklist: [],
  blockUrlSignatures: true,
};

export function getConfig(): FilterConfig {
  return config;
}

export function updateConfig(next: Partial<FilterConfig>): FilterConfig {
  if (typeof next.enabled === "boolean") config.enabled = next.enabled;
  if (Array.isArray(next.allowlist)) config.allowlist = next.allowlist;
  if (Array.isArray(next.blocklist)) config.blocklist = next.blocklist;
  if (typeof next.blockUrlSignatures === "boolean") {
    config.blockUrlSignatures = next.blockUrlSignatures;
  }
  return config;
}

function logDecision(
  d: Decision,
  surface: "REQUEST" | "POPUP" | "NAVIGATION",
  url: string,
  resourceType?: string,
): void {
  emit({
    level: d.action,
    surface,
    url,
    reason: d.reason,
    pattern: d.pattern,
    resourceType,
  });
}


/**
 * Attach the network interceptor to a session.
 *
 * `onBeforeRequest` runs for EVERY request the page makes, before Chromium
 * opens the socket. Returning `{ cancel: true }` is a real, observable
 * prevention — the request is never sent. That is what makes the matching
 * `[BLOCK]` line above a fact rather than a prediction.
 *
 * IMPORTANT CONSTRAINT: Electron keeps only ONE `onBeforeRequest` listener per
 * session — registering a second one silently REPLACES the first. So this
 * function is idempotent-guarded below, and nothing else in the codebase is
 * allowed to register a webRequest listener on the same session.
 */
let networkGuardInstalled = false;

export function installNetworkGuard(
  target: Electron.Session = session.defaultSession,
): void {
  if (networkGuardInstalled) return;
  networkGuardInstalled = true;

  target.webRequest.onBeforeRequest((details, callback) => {
    const decision = decideRequest(
      { url: details.url, resourceType: details.resourceType },
      config,
    );
    logDecision(decision, "REQUEST", details.url, details.resourceType);
    callback(decision.action === "block" ? { cancel: true } : {});
  });
}

/**
 * Attach popup + navigation protection to a webContents.
 *
 * POPUPS: `setWindowOpenHandler` is consulted for window.open() and
 * target=_blank *before* the window exists. Returning `{ action: "deny" }`
 * means no window is ever created — nothing flashes on screen and nothing
 * steals focus. This is the key hook for the "click Play → an ad page opens
 * itself" case.
 *
 * NAVIGATION: `will-navigate` fires for a main-frame navigation NOT started by
 * loadURL (a link click, form post, or script redirect). We block only on a
 * concrete filter-list hit, never merely because a URL went somewhere
 * external — so sign-in and payment returns keep working.
 */
export function installPopupGuard(
  contents: WebContents,
  /**
   * Called for an ALLOWED popup so the host can open it as a normal tab
   * instead of letting Electron spawn an unmanaged window.
   */
  requestTab: (url: string) => void,
): void {
  contents.setWindowOpenHandler((details) => {
    const url = details.url || "";
    const decision = decidePopup(url, config);
    logDecision(decision, "POPUP", url);
    if (decision.action === "block") return { action: "deny" };

    // An allowed popup is handed to the host as a regular tab, so it lives
    // inside the guarded session like everything else. We always deny the
    // raw window here: allowing it would create a BrowserWindow on its own
    // session, which no guard is attached to.
    if (url.startsWith("http://") || url.startsWith("https://")) {
      requestTab(url);
    }
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    const decision = decideNavigation(url, config);
    if (decision.action !== "block") {
      logDecision(decision, "NAVIGATION", url);
      return;
    }
    // Preventing the default here cancels the navigation for real.
    event.preventDefault();
    logDecision(decision, "NAVIGATION", url);
  });
}
