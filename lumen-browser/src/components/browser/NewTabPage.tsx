"use client";

/**
 * New tab page.
 *
 * Tiles come from the user's own bookmarks plus a short static starter list.
 * There are no remote "suggested sites", no sponsored tiles and no tracking
 * pixels — nothing is fetched to render this page.
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, History, Info, Search, Sparkles } from "lucide-react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { getEngine } from "@/lib/search/engines";
import { prettyUrl } from "@/lib/browser/url";
import { isKnownNonEmbeddable } from "@/lib/browser/detect";
import { Favicon } from "@/components/ui/Favicon";
import { StaggerItem, StaggerList, useTransitions } from "@/components/ui/Motion";

/** Embeddable-by-default starting points. */
const STARTER_SITES = [
  { url: "https://example.com", label: "Example" },
  { url: "https://en.wikipedia.org", label: "Wikipedia" },
  { url: "https://news.ycombinator.com", label: "Hacker News" },
  { url: "https://developer.mozilla.org", label: "MDN" },
  { url: "https://archive.org", label: "Archive" },
  { url: "https://openstreetmap.org", label: "OpenStreetMap" },
];

export function NewTabPage({ tabId }: { tabId: string }) {
  const navigate = useBrowserStore((s) => s.navigate);
  const bookmarks = useBrowserStore((s) => s.bookmarks);
  const history = useBrowserStore((s) => s.history);
  const searchEngine = useBrowserStore((s) => s.settings.searchEngine);
  const { spring, enabled } = useTransitions();

  // Most visited, computed from local history only.
  const frequent = useMemo(() => {
    const counts = new Map<string, { title: string; visits: number }>();
    for (const h of history) {
      const entry = counts.get(h.url);
      if (entry) entry.visits += 1;
      else counts.set(h.url, { title: h.title, visits: 1 });
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].visits - a[1].visits || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([url, v]) => ({ url, ...v }));
  }, [history]);

  const tiles = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ url: string; label: string }> = [];
    for (const b of bookmarks.slice(0, 6)) {
      if (seen.has(b.url)) continue;
      seen.add(b.url);
      out.push({ url: b.url, label: b.title });
    }
    for (const s of STARTER_SITES) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
    return out.slice(0, 8);
  }, [bookmarks]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[var(--bg-canvas)]">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-6 py-12">
        <motion.div
          initial={enabled ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-9 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl accent-gradient shadow-[var(--shadow-md)]">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Lumen</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-secondary">
            A focused browser that lives inside your browser. Type an address or search with{" "}
            {getEngine(searchEngine).name} — everything you visit stays on this device.
          </p>
        </motion.div>

        <StaggerList className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tiles.map((t) => {
            const blocked = isKnownNonEmbeddable(t.url);
            return (
              <StaggerItem key={t.url}>
                <button
                  type="button"
                  onClick={() => navigate(tabId, t.url)}
                  title={blocked ? `${blocked.host} often refuses to display inside a frame` : undefined}
                  className="group flex w-full items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)]"
                >
                  <Favicon url={t.url} size={18} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
                      {t.label}
                    </span>
                    <span className="block truncate text-[10.5px] text-muted">{prettyUrl(t.url)}</span>
                  </span>
                  {blocked ? (
                    <Info className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="May refuse to display inside Lumen" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              </StaggerItem>
            );
          })}
        </StaggerList>

        {frequent.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-muted uppercase">
              <History className="h-3.5 w-3.5" />
              Your most visited
            </h2>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {frequent.map((f) => (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => navigate(tabId, f.url)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <Favicon url={f.url} size={14} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--fg-primary)]">{f.title}</span>
                  <span className="shrink-0 text-[10.5px] text-muted">
                    {f.visits} {f.visits === 1 ? "visit" : "visits"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Plain statement of the real limitations, up front. */}
        <section className="mt-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--fg-primary)]">
            <Search className="h-3.5 w-3.5 text-muted" />
            Worth knowing before you start
          </h2>
          <ul className="space-y-1.5 text-[12px] leading-relaxed text-secondary">
            <li>
              Sites are shown in a real frame. If a site refuses to be framed — Google,
              GitHub, X and many others do — Lumen says so and offers to open it in a new
              tab. There is no way to view them inside Lumen, and we do not pretend otherwise.
            </li>
            <li>
              Lumen cannot see inside a framed page, so it cannot read its links. Back, forward
              and reload operate on the addresses Lumen itself loaded, and history records
              those — not every page you reach within a site.
            </li>
            <li>
              Nothing is uploaded. History, bookmarks and settings live in this browser&apos;s
              local storage and stay on this device.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
