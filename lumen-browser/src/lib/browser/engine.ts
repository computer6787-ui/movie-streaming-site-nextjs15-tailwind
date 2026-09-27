/**
 * Browser Engine Adapter.
 *
 * The whole point of this file is the seam described in the architecture:
 *
 *     Browser UI  ->  BrowserEngineAdapter  ->  <renderer>
 *
 * In the web build the adapter renders a cross-origin <iframe> and nothing
 * more. A future native build (Electron/Tauri/Android WebView) implements the
 * same interface with a real embedded engine, which unlocks real history,
 * real titles, a real request interceptor and real ad blocking — without the
 * UI changing at all.
 */

import type { BrowserTab } from "@/types/browser";

export interface NavigationOutcome {
  /** URL the renderer will attempt to load. */
  url: string;
  /**
   * `iframe`  — the site renders in a cross-origin frame (web build).
   * `native`  — the site renders in a real embedded Chromium engine.
   * `internal` — Lumen renders it itself (new tab page, error page, settings).
   * `blocked`  — a local rule refused to load it.
   *
   * `native` is additive: every existing consumer of this union keeps
   * compiling and behaves identically, which is what lets the same UI run on
   * either engine.
   */
  kind: "iframe" | "native" | "internal" | "blocked";
  /** Populated when kind === "blocked". */
  blockedBy?: { ruleId: string; pattern: string };
}

export interface FrameState {
  title?: string;
  favicon?: string;
  /** Internal navigation inside a same-origin frame we are allowed to read. */
  canReadUrl?: boolean;
}

export interface BrowserEngineAdapter {
  readonly id: "iframe" | "chromium" | "android-webview";
  readonly label: string;
  /**
   * False for the web build: we cannot read the frame's URL or title, so the
   * UI derives them from what we loaded rather than from the document.
   */
  readonly canInspectFrame: boolean;

  /**
   * Decide what should happen for a top-level URL. Backends own this so the UI
   * never has to know about protocol/rule details.
   */
  resolve(target: string, tab: Pick<BrowserTab, "id">): NavigationOutcome;

  onFrameState(cb: (state: FrameState) => void): () => void;
}
