"use client";

/**
 * Shared motion primitives.
 *
 * All springs come from `useMotionProfile()` so the user's animation setting is
 * honoured in one place. Springs are critically damped-ish (no bounce loops),
 * durations stay short, and nothing idles forever.
 */

import { motion, type Transition, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { useMotionProfile } from "@/lib/store/useMotionPrefs";

// ---------------------------------------------------------------- transitions
export function useTransitions() {
  const m = useMotionProfile();
  return { spring: m.spring, fast: m.fast, soft: m.soft, fade: m.fade, enabled: m.enabled };
}

// -------------------------------------------------------------------- panels
export const panelVariants = (distance = 24): Variants => ({
  hidden: { opacity: 0, x: distance, filter: "blur(6px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: distance, filter: "blur(6px)" },
});

export const sheetVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.99 },
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// ------------------------------------------------------------------- helpers
/** Fade + slight rise for page-level transitions. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const { soft, enabled } = useTransitions();
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={soft}
    >
      {children}
    </motion.div>
  );
}

/** Staggered list container. */
export function StaggerList({
  children,
  className,
  gap = 0.03,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const { fast, enabled } = useTransitions();
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const { fast, enabled } = useTransitions();
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8, scale: 0.99 },
        visible: { opacity: 1, y: 0, scale: 1, transition: fast },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A spring transition for things that should feel physical (tabs, indicators). */
export function springTransition(stiffness = 420, damping = 34): Transition {
  return { type: "spring", stiffness, damping, mass: 0.8 };
}

export { motion };
