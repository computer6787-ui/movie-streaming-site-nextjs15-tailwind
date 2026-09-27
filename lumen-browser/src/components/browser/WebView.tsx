"use client";

/**
 * WebView — the <iframe> layer.
 *
 * ── What this component deliberately does NOT do ────────────────────────────
 * It does not read `contentDocument` or `contentWindow`, it does not inject
 * scripts, and it does not proxy requests. For a cross-origin site those are
 * forbidden by the same-origin policy, and no amount of React changes that.
 *
 * ── Why frames are not kept alive ───────────────────────────────────────────
 * The shell mounts a WebView for the ACTIVE tab only. Keeping every background
 * tab's frame alive would multiply memory and network usage for pages nobody is
 * looking at, and reopening a frame is what restores its scroll position. The
 * only things that remount a frame are a URL change and an explicit
 * `viewEpoch` bump (the Reload button).
 */

import { memo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isKnownNonEmbeddable, LOAD_TIMEOUT_MS } from "@/lib/browser/detect";
import type { TabErrorKind } from "@/types/browser";
import { ErrorPage } from "./ErrorPage";
import { useTransitions } from "@/components/ui/Motion";

interface Props {
  tabId: string;
  url: string;
  status: "idle" | "loading" | "ready" | "error";
  error?: { kind: TabErrorKind; message: string };
  viewEpoch: number;
  onLoaded: (tabId: string) => void;
  onTimeout: (tabId: string) => void;
  onRetry: (tabId: string) => void;
  onHome: (tabId: string) => void;
}

export const WebView = memo(function WebView({
  tabId,
  url,
  status,
  error,
  viewEpoch,
  onLoaded,
  onTimeout,
  onRetry,
  onHome,
}: Props) {
  const { fade, enabled } = useTransitions();
  const timerRef = useRef<number | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const showError = status === "error" && !!error;
  const loading = status === "loading";

  // Watchdog: if the frame never reports a load, say so honestly. We report the
  // failure to the store, which flips the tab to its timeout error state — we
  // never guess at what is (or is not) rendering inside a cross-origin frame.
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => onTimeout(tabId), LOAD_TIMEOUT_MS);
    timerRef.current = t;
    return () => window.clearTimeout(t);
  }, [loading, tabId, url, viewEpoch, onTimeout]);

  const handleLoad = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // A cross-origin frame that loads at all is, from our side, "ready".
    // We make no claim about what it actually rendered inside.
    onLoaded(tabId);
  }, [tabId, onLoaded]);

  const openExternal = useCallback(() => {
    if (!url) return;
    // Ordinary browser navigation — no tricks, the site decides.
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const hint = isKnownNonEmbeddable(url);

  return (
    <div className="relative h-full w-full">
      <AnimatePresence initial={false}>
        {showError ? (
          <motion.div key="error" className="absolute inset-0" {...fade}>
            <ErrorPage
              kind={error!.kind}
              message={error!.message}
              url={url}
              onRetry={() => onRetry(tabId)}
              onHome={() => onHome(tabId)}
              onOpenExternal={openExternal}
            />
          </motion.div>
        ) : (
          <motion.div key="frame" className="absolute inset-0" {...fade}>
            <iframe
              ref={frameRef}
              key={`${url}-${viewEpoch}`}
              src={url}
              title={`Content from ${url}`}
              onLoad={handleLoad}
              referrerPolicy="no-referrer"
              loading="eager"
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              allow="fullscreen; geolocation; microphone; camera; encrypted-media; picture-in-picture"
              className="h-full w-full border-0 bg-white"
            />

            {/* A site that refuses framing usually renders its own notice.
                We cannot read it, so we surface an honest, dismissible hint
                instead of guessing at what is inside the frame. */}
            <AnimatePresence>
              {hint && !loading && (
                <motion.div
                  initial={enabled ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute inset-x-0 bottom-0 flex justify-center p-3"
                >
                  <div className="flex max-w-[min(560px,92%)] items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur">
                    <span className="text-[11.5px] leading-snug text-secondary">
                      Heads up — {hint.host} usually blocks embedded viewing. If the frame
                      looks empty, that is the site&apos;s policy, not a Lumen bug.
                    </span>
                    <button
                      type="button"
                      onClick={openExternal}
                      className="shrink-0 text-[11.5px] font-medium whitespace-nowrap text-[var(--accent-from)] hover:underline"
                    >
                      Open anyway
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
