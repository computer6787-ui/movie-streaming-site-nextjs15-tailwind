"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Info, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { getBlockingProvider } from "@/lib/blocking/provider";
import type { BlockingRule } from "@/lib/blocking/types";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { PanelShell } from "./PanelShell";

/**
 * Privacy panel.
 *
 * States its own limits before showing any numbers. A web app cannot see the
 * requests a framed site makes, so Lumen reports only the decisions it
 * genuinely made on URLs it controls — and labels the scope explicitly.
 */
export function PrivacyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const blockingEnabled = useBrowserStore((s) => s.settings.blockingEnabled);
  const updateSettings = useBrowserStore((s) => s.updateSettings);
  const clearAllLocalData = useBrowserStore((s) => s.clearAllLocalData);

  const [rules, setRules] = useState<BlockingRule[]>([]);
  const [stats, setStats] = useState(() => getBlockingProvider().stats());
  const [draft, setDraft] = useState("");
  const [wiping, setWiping] = useState(false);

  const provider = getBlockingProvider();

  // The rules engine is a plain class, not a store — subscribe to its events.
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      setRules(provider.listRules());
      setStats(provider.stats());
    };
    sync();
    return provider.subscribe(sync);
  }, [open, provider]);

  const addRule = () => {
    const pattern = draft.trim();
    if (!pattern) return;
    provider.addRule({ pattern, kind: "block", origin: "user" });
    setDraft("");
  };

  const resetStats = useCallback(() => {
    provider.resetStats();
    setStats(provider.stats());
  }, [provider]);

  const wipe = async () => {
    setWiping(true);
    try {
      // The store wipes storage and resets the engine's in-memory rules, so all
      // we do here is re-read the post-wipe state the panel renders from.
      await clearAllLocalData();
      setRules(provider.listRules());
      setStats(provider.stats());
    } finally {
      setWiping(false);
    }
  };

  const userRules = rules.filter((r) => r.origin === "user");
  const defaultRules = rules.filter((r) => r.origin === "default");

  return (
    <PanelShell
      open={open}
      onClose={onClose}
      title="Privacy"
      subtitle="Everything below is stored only on this device"
    >
      <div className="space-y-6">
        <section>
          <Switch
            checked={blockingEnabled}
            onChange={(v) => updateSettings({ blockingEnabled: v })}
            label="Local site rules"
            description="Block Lumen from loading sites you list. Stored here, never sent anywhere."
          />

          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[11.5px] leading-relaxed text-secondary">
              Lumen runs in a web page, so it cannot see or filter the requests a framed site
              makes — those happen inside your browser, out of reach of any website. These rules
              only control which sites Lumen opens, and the counters count{" "}
              <strong className="font-semibold text-[var(--fg-primary)]">only</strong> that.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted" />
            <h3 className="text-[12px] font-semibold text-[var(--fg-primary)]">
              Decisions Lumen actually made
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Checked" value={stats.observed} />
            <Stat label="Blocked" value={stats.blocked} />
            <Stat label="Allowed" value={stats.allowed} />
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
            Scope: {stats.surface}. Traffic inside framed pages is not visible to Lumen, so it is
            not counted here.
          </p>
          <Button variant="ghost" size="sm" onClick={resetStats} className="mt-2 w-full">
            <RotateCcw className="h-3 w-3" />
            Reset counters
          </Button>
        </section>

        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-[var(--fg-primary)]">
            Your rules ({userRules.length})
          </h3>

          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRule();
                }
              }}
              placeholder="tracker.example.com"
              aria-label="Host to block"
              className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[12px] outline-none placeholder:text-muted focus:border-[var(--border-strong)]"
            />
            <Button variant="soft" size="sm" onClick={addRule} disabled={!draft.trim()}>
              <Plus className="h-3.5 w-3.5" />
              Block
            </Button>
          </div>

          {userRules.length === 0 ? (
            <p className="mt-2.5 text-[11.5px] text-muted">
              No rules of your own yet. Lumen ships with a small default list, shown below.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1">
              {userRules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5"
                >
                  <Ban className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--fg-primary)]">
                    {r.pattern}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove rule ${r.pattern}`}
                    onClick={() => provider.removeRule(r.id)}
                    className="shrink-0 rounded p-1 text-muted hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {defaultRules.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[11.5px] text-muted hover:text-[var(--fg-primary)]">
                Show Lumen&apos;s default list ({defaultRules.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {defaultRules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="min-w-0 truncate text-muted">{r.pattern}</span>
                    <span className="shrink-0 text-[10px] text-muted">{r.category}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="border-t border-[var(--border-subtle)] pt-5">
          <h3 className="text-[12px] font-semibold text-[var(--fg-primary)]">Clear local data</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            Deletes history, bookmarks, saved tabs, settings and rules from this browser. It
            cannot delete anything from the sites you visited.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void wipe()}
            disabled={wiping}
            className="mt-3 w-full"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {wiping ? "Clearing…" : "Clear all Lumen data"}
          </Button>
        </section>
      </div>
    </PanelShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--bg-surface)] py-2">
      <div className="text-[17px] font-semibold tabular-nums text-[var(--fg-primary)]">{value}</div>
      <div className="text-[10.5px] text-muted">{label}</div>
    </div>
  );
}
