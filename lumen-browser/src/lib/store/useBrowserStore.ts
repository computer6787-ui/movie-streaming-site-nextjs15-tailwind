/**
 * The browser store — all browser state, zero UI concerns.
 *
 * Components subscribe with selectors so that (for example) typing in the
 * address bar never re-renders the iframe. The iframe is only re-created when a
 * tab's `url` or `viewEpoch` changes, which preserves scroll position and
 * in-page state when switching between tabs.
 */

import { create } from "zustand";
import type {
  Bookmark,
  BookmarkFolder,
  BrowserTab,
  BrowserTabId,
  ClosedTab,
  HistoryEntry,
  Settings,
} from "@/types/browser";
import { getEngineAdapter } from "@/lib/browser/get-adapter";
import { normalizeUrl, parseInput, titleFromUrl } from "@/lib/browser/url";
import { searchUrl } from "@/lib/search/engines";
import { getBlockingProvider } from "@/lib/blocking/provider";
import { DEFAULT_SETTINGS, MAX_CLOSED_TABS, emptySession, makeId } from "./defaults";
import {
  appendHistory,
  dropHistoryEntry,
  loadBookmarks,
  loadClosedTabs,
  loadFolders,
  loadHistory,
  loadSession,
  loadSettings,
  persistBookmarks,
  persistClosedTabs,
  persistFolders,
  persistSession,
  persistSettings,
  wipeEverything,
} from "./persist";

export function makeTab(url = "", opts: Partial<BrowserTab> = {}): BrowserTab {
  const now = Date.now();
  return {
    id: makeId(),
    url,
    title: url ? titleFromUrl(url) : "New Tab",
    session: url ? { entries: [url], index: 0 } : emptySession(),
    status: url ? "loading" : "idle",
    isNewTab: !url,
    createdAt: now,
    lastActiveAt: now,
    viewEpoch: 0,
    ...opts,
  };
}

export interface BrowserState {
  hydrated: boolean;
  tabs: BrowserTab[];
  activeTabId: BrowserTabId | null;
  closedTabs: ClosedTab[];
  settings: Settings;
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];

  hydrate: () => Promise<void>;

  // tabs
  newTab: (url?: string, opts?: { activate?: boolean }) => BrowserTabId;
  closeTab: (id: BrowserTabId) => void;
  closeOthers: (id: BrowserTabId) => void;
  setActiveTab: (id: BrowserTabId) => void;
  moveTab: (from: number, to: number) => void;
  duplicateTab: (id: BrowserTabId) => void;
  reopenClosedTab: () => void;

  // navigation
  navigate: (tabId: BrowserTabId, input: string, opts?: { push?: boolean }) => void;
  goBack: (tabId: BrowserTabId) => void;
  goForward: (tabId: BrowserTabId) => void;
  reload: (tabId: BrowserTabId) => void;
  goHome: (tabId: BrowserTabId) => void;
  setTabLoading: (tabId: BrowserTabId, loading: boolean) => void;
  setTabError: (tabId: BrowserTabId, error: NonNullable<BrowserTab["error"]>) => void;

  /**
   * Native-engine-only reporting actions.
   *
   * A cross-origin iframe cannot observe its own document, so the web build
   * never calls these. They exist so a REAL renderer (Electron) can feed the
   * honest title/URL it observes back into the same tabs, titles and history
   * the UI already renders.
   */
  setTabTitle: (tabId: BrowserTabId, title: string) => void;
  setTabUrl: (tabId: BrowserTabId, url: string) => void;
  markTabReady: (tabId: BrowserTabId) => void;

  // settings
  updateSettings: (patch: Partial<Settings>) => void;

  // bookmarks
  addBookmark: (input: { url: string; title?: string; folderId?: string | null }) => string;
  updateBookmark: (id: string, patch: Partial<Bookmark>) => void;
  removeBookmark: (id: string) => void;
  addFolder: (name: string, parentId?: string | null) => string;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;

  // history
  recordHistory: (entry: { url: string; title: string; favicon?: string }) => void;
  removeHistoryEntry: (id: string) => void;
  clearHistory: () => void;

  // privacy
  clearAllLocalData: () => Promise<void>;
}

export const selectActiveTab = (s: BrowserState): BrowserTab | undefined =>
  s.tabs.find((t) => t.id === s.activeTabId);

export const useBrowserStore = create<BrowserState>((set, get) => ({
  hydrated: false,
  tabs: [],
  activeTabId: null,
  closedTabs: [],
  settings: DEFAULT_SETTINGS,
  history: [],
  bookmarks: [],
  folders: [],

  async hydrate() {
    if (get().hydrated || typeof window === "undefined") return;

    const settings = loadSettings();
    const bookmarks = loadBookmarks();
    const folders = loadFolders();
    const closedTabs = loadClosedTabs();
    const history = await loadHistory();
    const session = loadSession();

    const restorable =
      !!session &&
      Array.isArray(session.tabs) &&
      session.tabs.length > 0 &&
      settings.startup === "restore-tabs";

    let tabs: BrowserTab[];
    let activeTabId: BrowserTabId | null;

    if (restorable && session) {
      tabs = session.tabs.map((t) => ({
        ...t,
        // Never restore a transient spinner from the previous run.
        status: "idle" as const,
        error: undefined,
      }));
      activeTabId =
        session.activeTabId && tabs.some((t) => t.id === session.activeTabId)
          ? session.activeTabId
          : (tabs[0]?.id ?? null);
    } else {
      const start = settings.startup === "homepage" ? settings.homepage : "";
      const tab = makeTab(start);
      tabs = [tab];
      activeTabId = tab.id;
    }

    getBlockingProvider().setEnabled(settings.blockingEnabled);
    set({ hydrated: true, settings, bookmarks, folders, closedTabs, history, tabs, activeTabId });
  },

  // ------------------------------------------------------------------ tabs
  newTab(url = "", opts) {
    const { settings, tabs } = get();
    const target = url || (settings.newTabBehavior === "homepage" ? settings.homepage : "");
    const tab = makeTab(target);
    set({
      tabs: [...tabs, tab],
      activeTabId: opts?.activate === false ? get().activeTabId : tab.id,
    });
    return tab.id;
  },

  closeTab(id) {
    const { tabs, activeTabId, closedTabs } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const tab = tabs[idx];
    const remaining = tabs.filter((t) => t.id !== id);

    const stack: ClosedTab[] = tab.url
      ? [
          {
            id: tab.id,
            url: tab.url,
            title: tab.title,
            favicon: tab.favicon,
            session: tab.session,
            closedAt: Date.now(),
          },
          ...closedTabs,
        ].slice(0, MAX_CLOSED_TABS)
      : closedTabs;

    let nextActive = activeTabId;
    if (activeTabId === id) {
      // Prefer the neighbour to the right, else the one to the left.
      const neighbour = remaining[Math.min(idx, remaining.length - 1)];
      nextActive = neighbour?.id ?? null;
    }

    if (!remaining.length) {
      const fresh = makeTab(
        get().settings.newTabBehavior === "homepage" ? get().settings.homepage : "",
      );
      set({ tabs: [fresh], activeTabId: fresh.id, closedTabs: stack });
      persistClosedTabs(stack);
      return;
    }

    set({ tabs: remaining, activeTabId: nextActive, closedTabs: stack });
    persistClosedTabs(stack);
  },

  closeOthers(id) {
    get()
      .tabs.filter((t) => t.id !== id)
      .forEach((t) => get().closeTab(t.id));
  },

  setActiveTab(id) {
    if (get().activeTabId === id) return;
    set({
      activeTabId: id,
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: Date.now() } : t)),
    });
  },

  moveTab(from, to) {
    const { tabs } = get();
    if (from === to || from < 0 || to < 0 || from >= tabs.length || to >= tabs.length) return;
    const next = [...tabs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ tabs: next });
  },

  duplicateTab(id) {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    const copy = makeTab(tab.url, {
      title: tab.title,
      favicon: tab.favicon,
      session: { entries: [...tab.session.entries], index: tab.session.index },
    });
    const idx = tabs.findIndex((t) => t.id === id);
    const next = [...tabs];
    next.splice(idx + 1, 0, copy);
    set({ tabs: next, activeTabId: copy.id });
  },

  reopenClosedTab() {
    const { closedTabs, tabs } = get();
    const [head, ...rest] = closedTabs;
    if (!head) return;
    const tab = makeTab(head.url, {
      title: head.title,
      favicon: head.favicon,
      session: head.session,
    });
    set({ tabs: [...tabs, tab], activeTabId: tab.id, closedTabs: rest });
    persistClosedTabs(rest);
  },

  // ------------------------------------------------------------ navigation
  navigate(tabId, rawInput, opts) {
    const { settings } = get();
    const parsed = parseInput(rawInput, settings.searchInAddressBar);
    const adapter = getEngineAdapter();

    let target: string;

    if (parsed.kind === "search") {
      const q = parsed.query?.trim();
      if (!q) {
        // Empty submit → return this tab to the new tab page.
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId
              ? { ...t, url: "", title: "New Tab", isNewTab: true, status: "idle", error: undefined, session: emptySession() }
              : t,
          ),
        }));
        return;
      }
      target = searchUrl(settings.searchEngine, q);
    } else if (parsed.unsupportedProtocol) {
      get().setTabError(tabId, {
        kind: "unsupported-protocol",
        message: `Lumen cannot display "${parsed.unsupportedProtocol}:" links inside the browser shell. Only http and https can be framed.`,
      });
      return;
    } else {
      target = normalizeUrl(parsed.url ?? rawInput);
    }

    const outcome = adapter.resolve(target, { id: tabId });

    if (outcome.kind === "blocked" && outcome.blockedBy) {
      const pattern = outcome.blockedBy.pattern;
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.id === tabId
            ? {
                ...t,
                url: target,
                title: target,
                isNewTab: false,
                status: "error" as const,
                error: {
                  kind: "blocked-by-user" as const,
                  message: `This site was blocked by your local rule "${pattern}".`,
                },
              }
            : t,
        ),
      }));
      return;
    }

    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const session =
          opts?.push === false
            ? t.session
            : {
                entries: [...t.session.entries.slice(0, t.session.index + 1), target],
                index: t.session.index + 1,
              };
        return {
          ...t,
          url: target,
          title: titleFromUrl(target),
          isNewTab: false,
          status: "loading" as const,
          error: undefined,
          session,
        };
      }),
    }));

    void get().recordHistory({ url: target, title: titleFromUrl(target) });
  },

  goBack(tabId) {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab || tab.session.index <= 0) return;
    const index = tab.session.index - 1;
    const url = tab.session.entries[index];
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              url,
              title: titleFromUrl(url),
              session: { ...t.session, index },
              status: url ? ("loading" as const) : ("idle" as const),
              isNewTab: !url,
              error: undefined,
            }
          : t,
      ),
    }));
  },

  goForward(tabId) {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab || tab.session.index >= tab.session.entries.length - 1) return;
    const index = tab.session.index + 1;
    const url = tab.session.entries[index];
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              url,
              title: titleFromUrl(url),
              session: { ...t.session, index },
              status: url ? ("loading" as const) : ("idle" as const),
              isNewTab: !url,
              error: undefined,
            }
          : t,
      ),
    }));
  },

  reload(tabId) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? // Bump the epoch so the <iframe> remounts without changing the URL.
            {
              ...t,
              status: t.url ? ("loading" as const) : ("idle" as const),
              error: undefined,
              viewEpoch: (t.viewEpoch ?? 0) + 1,
            }
          : t,
      ),
    }));
  },

  goHome(tabId) {
    get().navigate(tabId, get().settings.homepage);
  },

  setTabLoading(tabId, loading) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? { ...t, status: loading ? "loading" : t.error ? "error" : "ready" }
          : t,
      ),
    }));
  },

  setTabError(tabId, error) {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, status: "error", error } : t)),
    }));
  },

  /**
   * Report a real title from the engine.
   *
   * Only the native engine calls this: a cross-origin iframe cannot report its
   * own document title, so the web build keeps deriving titles from the URL.
   * That asymmetry is the honest reason these two actions exist at all.
   */
  setTabTitle(tabId, title) {
    if (!title) return;
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId && t.title !== title ? { ...t, title } : t)),
    }));
  },

  /**
   * Report the URL the engine actually landed on.
   *
   * A real renderer can navigate itself (redirects, in-page links, history
   * API), so the store's own session stack would otherwise drift from what is
   * on screen. With a real engine we can keep them in sync; with an iframe we
   * cannot, and this is simply never called.
   */
  setTabUrl(tabId, url) {
    if (!url) return;
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t;
        if (t.url === url) return t;
        const session =
          t.session.index >= 0 && t.session.entries[t.session.index] === url
            ? t.session
            : { entries: [...t.session.entries.slice(0, t.session.index + 1), url], index: t.session.index + 1 };
        return { ...t, url, isNewTab: false, session };
      }),
    }));
  },

  /** Mark a tab as fully loaded (native engine only). */
  markTabReady(tabId) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId && (t.status !== "ready" || t.error)
          ? { ...t, status: "ready" as const, error: undefined }
          : t,
      ),
    }));
  },

  // -------------------------------------------------------------- settings
  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    persistSettings(settings);
    if (patch.blockingEnabled !== undefined) {
      getBlockingProvider().setEnabled(patch.blockingEnabled);
    }
  },

  // ------------------------------------------------------------- bookmarks
  addBookmark({ url, title, folderId = null }) {
    const id = makeId();
    const now = Date.now();
    const normalized = normalizeUrl(url);
    const bookmark: Bookmark = {
      id,
      url: normalized,
      title: title?.trim() || titleFromUrl(normalized),
      folderId,
      createdAt: now,
      updatedAt: now,
    };
    const bookmarks = [...get().bookmarks, bookmark];
    set({ bookmarks });
    persistBookmarks(bookmarks);
    return id;
  },

  updateBookmark(id, patch) {
    const bookmarks = get().bookmarks.map((b) =>
      b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b,
    );
    set({ bookmarks });
    persistBookmarks(bookmarks);
  },

  removeBookmark(id) {
    const bookmarks = get().bookmarks.filter((b) => b.id !== id);
    set({ bookmarks });
    persistBookmarks(bookmarks);
  },

  addFolder(name, parentId = null) {
    const id = makeId();
    const folders = [
      ...get().folders,
      { id, name: name.trim() || "New folder", parentId, createdAt: Date.now() },
    ];
    set({ folders });
    persistFolders(folders);
    return id;
  },

  removeFolder(id) {
    // Bookmarks in a removed folder fall back to the root rather than vanish.
    const bookmarks = get().bookmarks.map((b) =>
      b.folderId === id ? { ...b, folderId: null } : b,
    );
    const folders = get()
      .folders.filter((f) => f.id !== id)
      .map((f) => (f.parentId === id ? { ...f, parentId: null } : f));
    set({ bookmarks, folders });
    persistBookmarks(bookmarks);
    persistFolders(folders);
  },

  renameFolder(id, name) {
    const folders = get().folders.map((f) => (f.id === id ? { ...f, name } : f));
    set({ folders });
    persistFolders(folders);
  },

  // --------------------------------------------------------------- history
  recordHistory(entry) {
    if (!entry.url || !/^https?:/.test(entry.url)) return;
    const record: HistoryEntry = { id: makeId(), ...entry, timestamp: Date.now() };
    const previous = get().history;
    set({ history: [record, ...previous.filter((h) => h.url !== record.url)] });
    void appendHistory(record, previous);
  },

  removeHistoryEntry(id) {
    set({ history: get().history.filter((h) => h.id !== id) });
    void dropHistoryEntry(id);
  },

  clearHistory() {
    set({ history: [] });
    void import("@/lib/storage/idb").then((m) => m.idbClear()).catch(() => {});
  },

  // ---------------------------------------------------------------- privacy
  async clearAllLocalData() {
    await wipeEverything();
    const fresh = makeTab();
    set({
      settings: DEFAULT_SETTINGS,
      history: [],
      bookmarks: [],
      folders: [],
      closedTabs: [],
      tabs: [fresh],
      activeTabId: fresh.id,
    });
    // The rules engine caches in memory, so it needs resetting explicitly —
    // otherwise deleted rules would keep blocking until the next page load.
    const blocking = getBlockingProvider();
    blocking.resetRules();
    blocking.setEnabled(DEFAULT_SETTINGS.blockingEnabled);
  },
}));

/** Persist the open session. Callers debounce this. */
export function persistCurrentSession(): void {
  const { tabs, activeTabId } = useBrowserStore.getState();
  persistSession(tabs, activeTabId);
}
