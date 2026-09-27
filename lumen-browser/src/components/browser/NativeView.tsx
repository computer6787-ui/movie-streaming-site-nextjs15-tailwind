"use client";

/**
 * NativeView — the Electron/WebContentsView layer.
 *
 * ── How this differs from WebView ──────────────────────────────────────────
 * WebView renders a cross-origin <iframe> and is honest about what that cannot
 * do. NativeView renders *nothing* itself: the page is a real Chromium
 * WebContentsView living in the main process. This component's only job is to
 * keep that view's bounds in sync with its placeholder element, and to forward
 * engine state into the existing store.
 *
 * Because the page is a real renderer, we can observe its title, favicon and
 * URL — and the guards in electron/guards.ts can intercept its requests,
 * popups and navigations for real.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { getElectronAdapter } from "@/lib/browser/electron-adapter";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { normalizeUrl } from "@/lib/browser/url";
import type { NativeBounds } from "@/types/native";

interface Props {
  tabId: string;
  url: string;
  status: "idle" | "loading" | "ready" | "error";
  viewEpoch: number;
  onLoaded: (tabId: string) => void;
  onTimeout: (tabId: string) => void;
  onTitle: (tabId: string, title: string) => void;
  onUrl: (tabId: string, url: string) => void;
}

export function NativeView({
  tabId,
  url,
  status,
  viewEpoch,
  onLoaded,
  onTimeout,
  onTitle,
  onUrl,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engine = getElectronAdapter();
  const loadTimeoutRef = useRef<number | null>(null);

  /* Attach the view, then keep its bounds locked to this element. */
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const toBounds = (): NativeBounds => {
      const r = host.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    };

    engine.attachTab(tabId, toBounds());

    const onResize = () => engine.setBounds(tabId, toBounds());
    window.addEventListener("resize", onResize);
    // The panels open/close and animate, so track the element itself rather
    // than only the window size.
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [engine, tabId]);

  /* Load the URL the store settled on. */
  useEffect(() => {
    if (!url) return;
    engine.loadTab(tabId, url);
  }, [engine, tabId, url, viewEpoch]);

  /* Engine state -> the existing store. */
  useEffect(() => {
    const bridge = window.lumenNative;
    if (!bridge) return;

    const offState = bridge.onTabState((state) => {
      if (state.tabId !== tabId) return;
      if (state.title) onTitle(tabId, state.title);
      if (state.url) onUrl(tabId, normalizeUrl(state.url));
      if (state.status === "loading" && loadTimeoutRef.current === null) {
        loadTimeoutRef.current = window.setTimeout(() => onTimeout(tabId), 20_000);
      }
      if (state.status === "ready") {
        onLoaded(tabId);
        if (loadTimeoutRef.current !== null) {
          window.clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      }
      if (state.status === "error" && state.error) {
        onLoaded(tabId);
        if (loadTimeoutRef.current !== null) {
          window.clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      }
    });

    return () => {
      offState();
      if (loadTimeoutRef.current !== null) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [tabId, onLoaded, onTimeout, onTitle, onUrl]);

  /**
   * An ALLOWED popup arrives here from the main process, which has already
   * refused to create a raw window so nothing escapes the guarded session. We
   * open it as an ordinary tab, reusing the store's own new-tab path so the
   * usual URL parsing, rules and session tracking all apply.
   */
  useEffect(() => {
    const bridge = window.lumenNative;
    if (!bridge) return;
    return bridge.onOpenNewTab(({ url }) => {
      if (!url) return;
      const store = useBrowserStore.getState();
      const newId = store.newTab();
      store.navigate(newId, url);
    });
  }, []);

  const showBlank = status === "idle" || !url;

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full bg-white"
      aria-busy={status === "loading"}
    >
      {showBlank && <span className="sr-only">Native view idle</span>}
    </div>
  );
}
