"use client";

/**
 * BrowserShell — the application frame.
 *
 *   ┌ tab strip ──────────────────────────────┐
 *   ├ toolbar: nav · address · tab actions ────┤
 *   ├───────────────────────┬─────────────────┤
 *   │ tab view (iframes)    │ optional panel  │
 *   └───────────────────────┴─────────────────┘
 *
 * Key decisions:
 *  - Only the ACTIVE tab mounts a WebView. Keeping every hidden tab's iframe
 *    alive would multiply memory and network usage for pages the user cannot
 *    see. A background tab keeps its URL and re-renders from it on return.
 *  - `viewEpoch` is the only thing that forces a frame remount (Reload), so
 *    typing in the address bar never re-creates a frame.
 */

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Clock, Minimize, Settings2, ShieldCheck } from "lucide-react";
import { useBrowserStore, persistCurrentSession } from "@/lib/store/useBrowserStore";
import { useUIStore, type PanelId } from "@/lib/store/useUIStore";
import { AddressBar } from "./AddressBar";
import { BrowserTabs } from "./BrowserTabs";
import { TabActions } from "./TabActions";
import { NavigationControls } from "./NavigationControls";
import { LoadingBar } from "./LoadingBar";
import { NewTabPage } from "./NewTabPage";
import { WebView } from "./WebView";
import { NativeView } from "./NativeView";
import { isNativeEngine } from "@/lib/browser/get-adapter";
import { getElectronAdapter } from "@/lib/browser/electron-adapter";
import { useTransitions } from "@/components/ui/Motion";
import { HistoryPanel } from "@/components/panels/HistoryPanel";
import { BookmarksPanel } from "@/components/panels/BookmarksPanel";
import { PrivacyPanel } from "@/components/panels/PrivacyPanel";
import { SettingsPanel } from "@/components/panels/SettingsPanel";

const PANEL_BUTTONS: Array<{ id: Exclude<PanelId, null>; icon: typeof Clock; label: string }> = [
  { id: "history", icon: Clock, label: "History" },
  { id: "bookmarks", icon: Bookmark, label: "Bookmarks" },
  { id: "privacy", icon: ShieldCheck, label: "Privacy" },
  { id: "settings", icon: Settings2, label: "Settings" },
];

export function BrowserShell() {
  const hydrated = useBrowserStore((s) => s.hydrated);
  const tabs = useBrowserStore((s) => s.tabs);
  const activeTabId = useBrowserStore((s) => s.activeTabId);
  const hydrate = useBrowserStore((s) => s.hydrate);
  const setTabLoading = useBrowserStore((s) => s.setTabLoading);
  const setTabError = useBrowserStore((s) => s.setTabError);
  const goHome = useBrowserStore((s) => s.goHome);
  const reload = useBrowserStore((s) => s.reload);

  const panel = useUIStore((s) => s.panel);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const closePanel = useUIStore((s) => s.closePanel);
  const fullscreen = useUIStore((s) => s.fullscreen);
  const setFullscreen = useUIStore((s) => s.setFullscreen);
  const { enabled } = useTransitions();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Native engine only: keep the main-process guards in step with the user's
  // Privacy-panel rules, so the desktop build and the web build honour the same
  // blocklist. A no-op in the iframe build.
  useEffect(() => {
    if (!isNativeEngine()) return;
    void getElectronAdapter().syncConfig();
  }, [hydrated]);

  // Debounced session persistence — never write on every keystroke.
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(persistCurrentSession, 600);
    return () => window.clearTimeout(t);
  }, [hydrated, tabs, activeTabId]);

  const handleLoaded = (tabId: string) => setTabLoading(tabId, false);

  // Native engine only: feed the title/URL the real renderer reports back into
  // the same store the iframe path uses, so tabs, titles and history work
  // identically on both engines.
  const handleTitle = (tabId: string, title: string) => {
    useBrowserStore.getState().setTabTitle(tabId, title);
  };

  const handleUrl = (tabId: string, url: string) => {
    useBrowserStore.getState().setTabUrl(tabId, url);
  };

  const handleTimeout = (tabId: string) => {
    const tab = useBrowserStore.getState().tabs.find((t) => t.id === tabId);
    if (!tab || tab.status !== "loading") return;
    setTabError(tabId, {
      kind: "timeout",
      message:
        "No response within 12 seconds. The site may be down, blocking the request, or refusing to load in a frame.",
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useBrowserStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "t") {
        e.preventDefault();
        store.newTab();
      } else if (mod && key === "w" && activeTabId) {
        e.preventDefault();
        store.closeTab(activeTabId);
      } else if (mod && key === "l") {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>('[aria-label="Address and search bar"]')
          ?.select();
      } else if (mod && key === "r" && activeTabId) {
        e.preventDefault();
        reload(activeTabId);
      } else if (mod && key === ",") {
        e.preventDefault();
        useUIStore.getState().togglePanel("settings");
      } else if (e.key === "Escape" && useUIStore.getState().fullscreen) {
        // Fullscreen hides the toolbar, so Escape must be the way out.
        e.preventDefault();
        useUIStore.getState().setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTabId, reload]);

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--bg-canvas)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-xl accent-gradient shadow-[var(--shadow-md)]" />
          <span className="text-[12px] text-muted">Restoring your session…</span>
        </div>
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[var(--bg-canvas)]">
      {!fullscreen && (
        <div className="glass z-20 shrink-0 border-b border-[var(--border-subtle)]">
          <BrowserTabs />
        </div>
      )}

      {!fullscreen && (
        <div className="glass relative z-10 flex items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-1.5">
          <NavigationControls tabId={activeTabId ?? ""} />
          {activeTab ? (
            <AddressBar tabId={activeTab.id} url={activeTab.url} status={activeTab.status} />
          ) : (
            <div className="flex-1" />
          )}
          <TabActions />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          {fullscreen && (
            // Fullscreen removes the toolbar, so the way out has to live here.
            <motion.button
              type="button"
              onClick={() => setFullscreen(false)}
              initial={enabled ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: enabled ? 0.2 : 0, delay: enabled ? 0.6 : 0 }}
              aria-label="Exit full screen (Escape)"
              title="Exit full screen (Esc)"
              className="absolute right-3 bottom-3 z-30 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/90 text-[var(--fg-secondary)] shadow-[var(--shadow-md)] backdrop-blur hover:text-[var(--fg-primary)]"
            >
              <Minimize className="h-4 w-4" />
            </motion.button>
          )}

          {activeTab && (
            <>
              <LoadingBar active={activeTab.status === "loading"} epoch={activeTab.viewEpoch ?? 0} />

              <AnimatePresence mode="wait" initial={false}>
                {activeTab.isNewTab || !activeTab.url ? (
                  <motion.div
                    key={`new-${activeTab.id}`}
                    className="absolute inset-0"
                    initial={enabled ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: enabled ? 0 : 1 }}
                    transition={{ duration: enabled ? 0.14 : 0 }}
                  >
                    <NewTabPage tabId={activeTab.id} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeTab.id}
                    className="absolute inset-0"
                    initial={enabled ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: enabled ? 0 : 1 }}
                    transition={{ duration: enabled ? 0.12 : 0 }}
                  >
                    isNativeEngine() ? (
                      <NativeView
                        tabId={activeTab.id}
                        url={activeTab.url}
                        status={activeTab.status}
                        viewEpoch={activeTab.viewEpoch ?? 0}
                        onLoaded={handleLoaded}
                        onTimeout={handleTimeout}
                        onTitle={handleTitle}
                        onUrl={handleUrl}
                      />
                    ) : (
                      <WebView
                        tabId={activeTab.id}
                        url={activeTab.url}
                        status={activeTab.status}
                        error={activeTab.error}
                        viewEpoch={activeTab.viewEpoch ?? 0}
                        onLoaded={handleLoaded}
                        onTimeout={handleTimeout}
                        onRetry={(id) => reload(id)}
                        onHome={(id) => goHome(id)}
                      />
                    )
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {!fullscreen && (
            <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5 safe-bottom">
              {PANEL_BUTTONS.map(({ id, icon: Icon, label }) => (
                <PanelButton
                  key={id}
                  active={panel === id}
                  label={label}
                  onClick={() => togglePanel(id)}
                >
                  <Icon className="h-4 w-4" />
                </PanelButton>
              ))}
            </div>
          )}
        </main>

        {!fullscreen && (
          // On wide screens the panel is a column beside the content; on narrow
          // ones PanelShell itself becomes a fixed full-width sheet, so this
          // wrapper must stay in the DOM at every size.
          <div className="contents lg:block lg:w-[380px] lg:shrink-0">
            <div className="h-full border-l border-[var(--border-subtle)]">
              <HistoryPanel open={panel === "history"} onClose={closePanel} />
              <BookmarksPanel open={panel === "bookmarks"} onClose={closePanel} />
              <PrivacyPanel open={panel === "privacy"} onClose={closePanel} />
              <SettingsPanel open={panel === "settings"} onClose={closePanel} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { fast, enabled } = useTransitions();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      whileTap={enabled ? { scale: 0.9 } : undefined}
      transition={fast}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-[var(--shadow-md)] transition-colors ${
        active
          ? "border-transparent accent-gradient text-white"
          : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
      }`}
    >
      {children}
    </motion.button>
  );
}
