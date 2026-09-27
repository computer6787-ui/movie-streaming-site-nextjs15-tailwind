"use client";

/**
 * The tab strip.
 *
 * Performance: `TabItem` is memoised and takes primitives only, so switching
 * tabs re-renders one tab instead of the whole strip.
 *
 * Motion: a single shared `layoutId` drives the active-tab indicator so it
 * glides between tabs on one spring, and closing scales the tab down rather
 * than collapsing the entire row.
 */

import { memo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import type { BrowserTab } from "@/types/browser";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { Favicon } from "@/components/ui/Favicon";
import { useTransitions } from "@/components/ui/Motion";

export function BrowserTabs() {
  const tabs = useBrowserStore((s) => s.tabs);
  const activeTabId = useBrowserStore((s) => s.activeTabId);
  const setActiveTab = useBrowserStore((s) => s.setActiveTab);
  const newTab = useBrowserStore((s) => s.newTab);
  const moveTab = useBrowserStore((s) => s.moveTab);
  const { fast, spring, enabled } = useTransitions();

  const dragFrom = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div
      onPointerUp={() => {
        if (dragFrom.current !== null && overIndex !== null && dragFrom.current !== overIndex) {
          moveTab(dragFrom.current, overIndex);
        }
        dragFrom.current = null;
        setOverIndex(null);
      }}
      onPointerLeave={() => setOverIndex(null)}
      className="flex items-stretch gap-1.5 border-b border-[var(--border-subtle)] px-2 pt-1.5"
    >
      <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {tabs.map((tab, i) => (
            <TabItem
              key={tab.id}
              tab={tab}
              index={i}
              active={tab.id === activeTabId}
              dragging={overIndex === i && dragFrom.current !== i}
              onSelect={() => setActiveTab(tab.id)}
              onDragStart={() => {
                dragFrom.current = i;
              }}
              onHover={() => {
                if (dragFrom.current !== null) setOverIndex(i);
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={() => newTab()}
        whileTap={enabled ? { scale: 0.9 } : undefined}
        transition={fast}
        aria-label="New tab"
        title="New tab (Ctrl+T)"
        className="mb-1 flex h-[var(--tab-h)] w-8 shrink-0 items-center justify-center rounded-lg text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
      >
        <Plus className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

// --------------------------------------------------------------------- tab
interface TabItemProps {
  tab: BrowserTab;
  index: number;
  active: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onHover: () => void;
}

const TabItem = memo(function TabItem({
  tab,
  active,
  dragging,
  onSelect,
  onDragStart,
  onHover,
}: TabItemProps) {
  const closeTab = useBrowserStore((s) => s.closeTab);
  const { spring, enabled } = useTransitions();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout={enabled ? "position" : false}
      initial={enabled ? { opacity: 0, scale: 0.92, width: 0 } : false}
      animate={{ opacity: 1, scale: 1, width: "auto" }}
      exit={
        enabled
          ? { opacity: 0, scale: 0.9, width: 0, transition: { duration: 0.14 } }
          : { opacity: 0 }
      }
      transition={spring}
      draggable
      onDragStart={onDragStart}
      onPointerEnter={() => {
        setHovered(true);
        onHover();
      }}
      onPointerLeave={() => setHovered(false)}
      className={`group relative shrink-0 ${dragging ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-[var(--tab-h)] max-w-[210px] min-w-[54px] items-center gap-2 rounded-t-lg border border-b-0 px-2.5 text-left transition-colors duration-150 ${
          active
            ? "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
            : "border-transparent bg-transparent text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]"
        }`}
      >
        <Favicon url={tab.url} size={14} className={tab.status === "loading" ? "animate-pulse" : ""} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{tab.title}</span>

        <span
          role="button"
          tabIndex={-1}
          aria-label={`Close ${tab.title}`}
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-150 hover:bg-[var(--bg-active)] ${
            active || hovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <X className="h-3 w-3" />
        </span>
      </button>

      {active && (
        <motion.span
          layoutId="lumen-tab-indicator"
          className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full accent-gradient"
          transition={spring}
        />
      )}
    </motion.div>
  );
});
