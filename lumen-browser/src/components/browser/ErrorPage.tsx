"use client";

/**
 * Polished error states.
 *
 * These pages never pretend a failure is anything else, and they never suggest
 * a way around browser security. "Open in new tab" uses ordinary browser
 * navigation (`window.open`) — the site's own rules then apply, and that is the
 * user's browser, not ours.
 */

import { motion } from "motion/react";
import {
  Ban,
  ExternalLink,
  FileQuestion,
  Link2Off,
  RefreshCw,
  ShieldAlert,
  Timer,
  WifiOff,
} from "lucide-react";
import type { TabErrorKind } from "@/types/browser";
import { prettyUrl } from "@/lib/browser/url";
import { Button } from "@/components/ui/Button";
import { useTransitions } from "@/components/ui/Motion";

interface Props {
  kind: TabErrorKind;
  message: string;
  url: string;
  onRetry: () => void;
  onHome: () => void;
  onOpenExternal: () => void;
  onBookMarkBlocked?: () => void;
}

const COPY: Record<
  TabErrorKind,
  { icon: typeof Ban; title: string; body: string; tone: string }
> = {
  "blocked-by-site": {
    icon: ShieldAlert,
    title: "This website cannot be displayed inside the browser",
    body: "The website prevents embedded viewing for security reasons. It sends an X-Frame-Options or Content-Security-Policy header that tells browsers not to render it in a frame. Lumen respects that — working around it is not possible from a web page, and we would not try.",
    tone: "text-amber-500",
  },
  "unsupported-protocol": {
    icon: Link2Off,
    title: "That link cannot be opened here",
    body: "Lumen can only display http and https pages. Other schemes — like mailto:, tel: or app links — are handled by the operating system, not by a web page.",
    tone: "text-amber-500",
  },
  "invalid-url": {
    icon: FileQuestion,
    title: "That address could not be understood",
    body: "Check the spelling and try again. You can type a domain such as example.com, a full address, or a search term.",
    tone: "text-amber-500",
  },
  network: {
    icon: WifiOff,
    title: "The site could not be reached",
    body: "The connection failed or the host is unreachable. This is usually the site's problem, your network, or a site that does not exist.",
    tone: "text-rose-500",
  },
  timeout: {
    icon: Timer,
    title: "The site took too long to respond",
    body: "The page did not finish loading in time, so the frame was left blank. This does not tell us whether the site is down — only that nothing arrived before the timeout.",
    tone: "text-amber-500",
  },
  "blocked-by-user": {
    icon: Ban,
    title: "This site is blocked by your own rules",
    body: "You asked Lumen not to load this site. You can change that any time in the Privacy panel.",
    tone: "text-amber-500",
  },
};

export function ErrorPage({ kind, message, url, onRetry, onHome, onOpenExternal }: Props) {
  const { soft, fast, enabled } = useTransitions();
  const copy = COPY[kind] ?? COPY.network;
  const Icon = copy.icon;
  const display = url ? prettyUrl(url) : "";

  return (
    <motion.div
      initial={enabled ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={soft}
      className="flex h-full w-full items-center justify-center overflow-y-auto bg-[var(--bg-canvas)] px-6 py-10"
    >
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={enabled ? { scale: 0.9, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={fast}
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)]"
        >
          <Icon className={`h-6 w-6 ${copy.tone}`} strokeWidth={1.8} />
        </motion.div>

        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
          {copy.title}
        </h1>

        {display && (
          <p className="mt-2 truncate text-[13px] text-muted" title={url}>
            {display}
          </p>
        )}

        <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-secondary">{copy.body}</p>

        {message && message !== copy.body && (
          <p className="mx-auto mt-3 max-w-sm rounded-lg bg-[var(--bg-surface)] px-3 py-2 text-[12px] text-muted">
            {message}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button variant="solid" size="md" onClick={onOpenExternal}>
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </Button>
          <Button variant="outline" size="md" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Button variant="ghost" size="md" onClick={onHome}>
            Go home
          </Button>
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-muted">
          “Open in new tab” uses your browser’s normal navigation. Whether that site loads
          is up to that site, not to Lumen.
        </p>
      </div>
    </motion.div>
  );
}
