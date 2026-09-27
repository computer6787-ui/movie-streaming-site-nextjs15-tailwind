"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Home, RotateCw, Maximize2, Minimize2 } from "lucide-react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { useTransitions } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";

/**
 * Back / Forward / Reload / Home.
 *
 * IMPORTANT: back and forward walk the history of URLs *this application*
 * loaded for this tab. Links clicked inside a cross-origin frame belong to the
 * framed site's own history, which the page cannot read — we do not pretend
 * otherwise, and there is no insecure workaround for it.
 */
export const NavigationControls = memo(function NavigationControls({
  tabId,
  compact,
}: {
  tabId: string;
  compact?: boolean;
}) {
  const tab = useBrowserStore((s) => s.tabs.find((t) => t.id === tabId));
  const goBack = useBrowserStore((s) => s.goBack);
  const goForward = useBrowserStore((s) => s.goForward);
  const reload = useBrowserStore((s) => s.reload);
  const goHome = useBrowserStore((s) => s.goHome);
  const fullscreen = useUIStore((s) => s.fullscreen);
  const toggleFullscreen = useUIStore((s) => s.toggleFullscreen);
  const { fast, enabled } = useTransitions();

  const canBack = !!tab && tab.session.index > 0;
  const canForward = !!tab && tab.session.index < tab.session.entries.length - 1;
  const hasUrl = !!tab?.url;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        size="icon"
        variant="ghost"
        disabled={!canBack}
        onClick={() => goBack(tabId)}
        aria-label="Back"
        title="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        disabled={!canForward}
        onClick={() => goForward(tabId)}
        aria-label="Forward"
        title="Forward"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>

      <motion.span
        key={`${hasUrl}-${tab?.status === "loading"}`}
        whileTap={enabled ? { rotate: -180 } : undefined}
        transition={fast}
        className="inline-flex"
      >
        <Button
          size="icon"
          variant="ghost"
          disabled={!hasUrl}
          onClick={() => reload(tabId)}
          aria-label="Reload"
          title="Reload"
        >
          {tab?.status === "loading" ? (
            <RotateCw className="h-4 w-4 animate-spin" style={{ animationDuration: "0.8s" }} />
          ) : (
            <RotateCw className="h-4 w-4" />
          )}
        </Button>
      </motion.span>

      {!compact && (
        <Button size="icon" variant="ghost" onClick={() => goHome(tabId)} aria-label="Home" title="Home">
          <Home className="h-4 w-4" />
        </Button>
      )}

      <Button
        size="icon"
        variant="ghost"
        onClick={toggleFullscreen}
        aria-label={fullscreen ? "Exit full screen" : "Full screen"}
        title={fullscreen ? "Exit full screen" : "Full screen"}
      >
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );
});
