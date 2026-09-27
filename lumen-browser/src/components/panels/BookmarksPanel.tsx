"use client";

import { useMemo } from "react";
import { ExternalLink, Folder, Star, Trash2 } from "lucide-react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { prettyUrl } from "@/lib/browser/url";
import { Favicon } from "@/components/ui/Favicon";
import { Button } from "@/components/ui/Button";
import { StaggerItem, StaggerList } from "@/components/ui/Motion";
import { PanelShell } from "./PanelShell";
import { EmptyState } from "./HistoryPanel";

export function BookmarksPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bookmarks = useBrowserStore((s) => s.bookmarks);
  const folders = useBrowserStore((s) => s.folders);
  const removeBookmark = useBrowserStore((s) => s.removeBookmark);
  const newTab = useBrowserStore((s) => s.newTab);

  // Root first, then each folder, in creation order.
  const grouped = useMemo(() => {
    const groups: Array<{ id: string | null; name: string; items: typeof bookmarks }> = [
      { id: null, name: "All bookmarks", items: bookmarks },
    ];
    for (const f of folders) {
      groups.push({ id: f.id, name: f.name, items: bookmarks.filter((b) => b.folderId === f.id) });
    }
    return groups;
  }, [bookmarks, folders]);

  const total = bookmarks.length;

  return (
    <PanelShell
      open={open}
      onClose={onClose}
      title="Bookmarks"
      subtitle={total > 0 ? `${total} saved on this device` : undefined}
    >
      {total === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          body="Use the star in the address bar to save a page. Bookmarks are stored locally, never synced."
        />
      ) : (
        <div className="space-y-5">
          {grouped
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.id ?? "root"}>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  {g.id === null ? <Star className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                  {g.name}
                </h3>
                <StaggerList className="space-y-0.5" gap={0.015}>
                  {g.items.map((b) => (
                    <StaggerItem key={b.id}>
                      <div className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--bg-hover)]">
                        <button
                          type="button"
                          onClick={() => {
                            newTab(b.url);
                            onClose();
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <Favicon url={b.url} size={14} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
                              {b.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted">
                              {prettyUrl(b.url)}
                            </span>
                          </span>
                        </button>
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${b.title} in a new tab`}
                          className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--fg-primary)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          aria-label={`Remove bookmark ${b.title}`}
                          onClick={() => removeBookmark(b.id)}
                          className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--fg-primary)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerList>
              </section>
            ))}
        </div>
      )}
    </PanelShell>
  );
}
