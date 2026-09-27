"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { prettyUrl } from "@/lib/browser/url";
import { Favicon } from "@/components/ui/Favicon";
import { Button } from "@/components/ui/Button";
import { StaggerItem, StaggerList } from "@/components/ui/Motion";
import { PanelShell } from "./PanelShell";

/** Relative time, local, no library. */
function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const history = useBrowserStore((s) => s.history);
  const removeHistoryEntry = useBrowserStore((s) => s.removeHistoryEntry);
  const clearHistory = useBrowserStore((s) => s.clearHistory);
  const newTab = useBrowserStore((s) => s.newTab);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q),
    );
  }, [history, query]);

  return (
    <PanelShell
      open={open}
      onClose={onClose}
      title="History"
      subtitle="Addresses Lumen loaded on this device"
      footer={
        history.length > 0 ? (
          <Button variant="danger" size="sm" onClick={clearHistory} className="w-full">
            <Trash2 className="h-3.5 w-3.5" />
            Clear all history
          </Button>
        ) : undefined
      }
    >
      {history.length > 0 && (
        <div className="mb-3 flex h-8 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted"
          />
        </div>
      )}

      {history.length === 0 ? (
        <EmptyState
          title="No history yet"
          body="Addresses you load in Lumen appear here. They are stored only in this browser, on this device."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" body={`Nothing in your history matches “${query}”.`} />
      ) : (
        <StaggerList className="space-y-0.5" gap={0.015}>
          {filtered.map((h) => (
            <StaggerItem key={h.id}>
              <div className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--bg-hover)]">
                <button
                  type="button"
                  onClick={() => {
                    newTab(h.url);
                    onClose();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <Favicon url={h.url} size={14} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
                      {h.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted">{prettyUrl(h.url)}</span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-muted">{ago(h.timestamp)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${h.title} from history`}
                  onClick={() => removeHistoryEntry(h.id)}
                  className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--fg-primary)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </PanelShell>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-[13px] font-medium text-[var(--fg-primary)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[26ch] text-[11.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
