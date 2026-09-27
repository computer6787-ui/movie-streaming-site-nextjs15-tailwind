/**
 * Core browser domain types.
 *
 * These are deliberately free of any React/DOM concern so the browser state
 * layer stays independent from the UI (see `lib/browser/engine`).
 */

export type BrowserTabId = string;

/** Why a tab is currently not showing a live page. */
export type TabErrorKind =
  | "blocked-by-site" // site sends X-Frame-Options / frame-ancestors
  | "unsupported-protocol" // e.g. about:, data:, chrome:
  | "invalid-url"
  | "network"
  | "timeout"
  | "blocked-by-user"; // matched a local blocking rule

export type TabStatus = "idle" | "loading" | "ready" | "error";

export interface BrowserTab {
  id: BrowserTabId;
  /** Normalized, absolute URL. Empty string means "new tab page". */
  url: string;
  title: string;
  favicon?: string;
  /** Per-tab navigation stack owned by *this app* (see TabSession). */
  session: TabSession;
  status: TabStatus;
  error?: { kind: TabErrorKind; message: string };
  /** True when this tab has never been given a URL (shows NewTab page). */
  isNewTab?: boolean;
  /** Bumped to force the view layer to remount (e.g. after a hard reset). */
  viewEpoch?: number;
  createdAt: number;
  lastActiveAt: number;
}

/**
 * Navigation history for a single tab.
 *
 * IMPORTANT: This is the history of URLs *this application* loaded. Because the
 * target site lives in a cross-origin iframe we cannot read its internal
 * history, so in-page links inside the frame are not trackable here. We keep
 * this stack honest rather than pretending to be a real browser history.
 */
export interface TabSession {
  entries: string[];
  index: number;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export type BookmarkFolderId = string | null; // null === Bookmarks Bar root

export interface BookmarkFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  folderId: BookmarkFolderId;
  createdAt: number;
  updatedAt: number;
}

export type ThemeMode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable";
export type AnimationIntensity = "full" | "reduced" | "off";
export type SearchEngineId = "duckduckgo" | "google" | "bing" | "brave" | "startpage";
export type AccentId = "lumen" | "violet" | "emerald" | "amber" | "rose" | "sky";

export type NewTabBehavior = "new-tab-page" | "homepage" | "blank";
export type StartupBehavior = "restore-tabs" | "new-tab" | "homepage";

export interface Settings {
  // Appearance
  theme: ThemeMode;
  accent: AccentId;
  density: Density;
  animation: AnimationIntensity;
  reduceTransparency: boolean;

  // Search
  searchEngine: SearchEngineId;
  searchInAddressBar: boolean;

  // Browser
  homepage: string;
  startup: StartupBehavior;
  newTabBehavior: NewTabBehavior;

  // Privacy / blocking
  blockingEnabled: boolean;
  allowlist: string[];
  blocklist: string[];
}

export interface ClosedTab {
  id: BrowserTabId;
  url: string;
  title: string;
  favicon?: string;
  session: TabSession;
  closedAt: number;
}

/** A provider that can persist + restore the whole session. */
export interface PersistedSession {
  version: number;
  tabs: BrowserTab[];
  activeTabId: BrowserTabId;
  closedTabs: ClosedTab[];
  savedAt: number;
}
