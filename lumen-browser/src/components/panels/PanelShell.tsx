"use client";

/**
 * Slide-in panel shell shared by History, Bookmarks, Tabs, Privacy and Settings.
 *
 * Panels are a sibling of the content area rather than an overlay, so opening
 * one never re-mounts an <iframe> and never interrupts a page that is loading.
 * On narrow screens it becomes a full-width sheet with a scrim.
 */

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { panelVariants, useTransitions } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function PanelShell({ open, onClose, title, subtitle, children, footer }: Props) {
  const { soft, enabled } = useTransitions();

  // Escape closes the panel; the shell owns the key handling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim: only on small screens, where the panel is a sheet. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={soft}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px] lg:hidden"
          />

          <motion.aside
            role="dialog"
            aria-label={title}
            variants={panelVariants(enabled ? 32 : 0)}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={soft}
            className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)] lg:static lg:z-auto lg:shadow-none"
          >
            <header className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
                  {title}
                </h2>
                {subtitle && <p className="mt-0.5 text-[11.5px] text-muted">{subtitle}</p>}
              </div>
              <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close panel">
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {children}
            </div>

            {footer && (
              <footer className="border-t border-[var(--border-subtle)] px-4 py-3 safe-bottom">
                {footer}
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
