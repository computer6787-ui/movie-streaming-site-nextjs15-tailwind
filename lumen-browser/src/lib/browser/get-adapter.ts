/**
 * Engine selection — the ONE place that decides which backend is in use.
 *
 * `getEngineAdapter()` used to be exported from iframe-adapter.ts. That
 * function still exists and still works, so nothing that imported it breaks;
 * everything now goes through here instead, which lets the native engine take
 * over on the desktop without touching a single caller.
 *
 * The rule is simple and honest: if the Electron preload bridge is present, we
 * have a real Chromium engine and we use it. Otherwise we fall back to the
 * iframe build, which still works for anyone opening Lumen in a normal browser.
 */

import type { BrowserEngineAdapter } from "./engine";
import { IframeAdapter, getEngineAdapter as getIframeAdapter } from "./iframe-adapter";
import { ElectronAdapter, getElectronAdapter, isNativeRuntime } from "./electron-adapter";

let active: BrowserEngineAdapter | null = null;

export function getEngineAdapter(): BrowserEngineAdapter {
  if (active) return active;
  active = isNativeRuntime() ? getElectronAdapter() : getIframeAdapter();
  return active;
}

/** True when the active engine is a real browser rather than a frame. */
export function isNativeEngine(): boolean {
  return getEngineAdapter().id === "chromium";
}

export { isNativeRuntime, IframeAdapter, ElectronAdapter };
