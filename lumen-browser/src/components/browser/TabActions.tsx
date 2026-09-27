"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, MoreHorizontal, RotateCcw } from "lucide-react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { useTransitions } from "@/components/ui/Motion";

/** Overflow menu for the active tab: duplicate, reopen closed, tab count. */
export function TabActions() {
  const activeTabId = useBrowserStore((s) => s.activeTabId);
  const duplicateTab = useBrowserStore((s) => s.duplicateTab);
  const reopenClosedTab = useBrowserStore((s) => s.reopenClosedTab);
  const closedCount = useBrowserStore((s) => s.closedTabs.length);
  const tabCount = useBrowserStore((s) => s.tabs.length);
  const { fast, enabled } = useTransitions();
  const [open, setOpen] = useState(false);

  if (!activeTabId) return null;

  return (
    <div className="relative shrink-0">
      <motion.button
        type="button"
        aria-label="Tab actions"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        whileTap={enabled ? { scale: 0.9 } : undefined}
        transition={fast}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              role="menu"
              initial={enabled ? { opacity: 0, y: -4, scale: 0.98 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={enabled ? { opacity: 0, y: -4, scale: 0.98 } : { opacity: 0 }}
              transition={fast}
              className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-lg)]"
            >
              <MenuItem
                icon={<Copy className="h-3.5 w-3.5" />}
                label="Duplicate tab"
                onClick={() => {
                  duplicateTab(activeTabId);
                  setOpen(false);
                }}
              />
              <MenuItem
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                label="Reopen closed tab"
                disabled={closedCount === 0}
                hint={closedCount > 0 ? String(closedCount) : undefined}
                onClick={() => {
                  reopenClosedTab();
                  setOpen(false);
                }}
              />
              <p className="px-2 py-1.5 text-[10.5px] leading-relaxed text-muted">
                {tabCount} open. Drag a tab to reorder it.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[var(--fg-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10.5px] text-muted">{hint}</span>}
    </button>
  );
}
