"use client";

/**
 * Thin browser-style progress bar.
 *
 * It animates toward a target and completes when the frame reports `onLoad`.
 * It is intentionally *indeterminate-feeling* but honest: it never claims a
 * percentage, because the page cannot measure the framed document's progress.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  active: boolean;
  /** Increments each time a new load starts, restarting the animation. */
  epoch: number;
}

export function LoadingBar({ active, epoch }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    setProgress(0.08);
    // Creep toward — but never reach — 90% while the frame is still loading.
    const timer = window.setInterval(() => {
      setProgress((p) => (p >= 0.9 ? p : p + Math.random() * 0.12));
    }, 220);
    return () => window.clearInterval(timer);
  }, [active, epoch]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="loader"
          className="pointer-events-none absolute inset-x-0 top-0 z-40 h-[2.5px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="h-full rounded-full accent-gradient"
            initial={{ width: "8%" }}
            animate={{ width: `${Math.min(progress, 0.92) * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.6 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
