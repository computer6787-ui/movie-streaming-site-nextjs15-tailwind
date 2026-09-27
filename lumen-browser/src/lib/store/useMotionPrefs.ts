"use client";

import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "./useBrowserStore";
import type { AnimationIntensity, Density } from "@/types/browser";

export interface MotionProfile {
  /** Base spring used across tabs, panels and controls. */
  spring: { type: "spring"; stiffness: number; damping: number; mass: number };
  /** Quicker spring for small, tactile elements. */
  fast: { type: "spring"; stiffness: number; damping: number; mass: number };
  /** Slightly softer spring for panels/sheets. */
  soft: { type: "spring"; stiffness: number; damping: number; mass: number };
  fade: { duration: number };
  /** 0 = no movement, 1 = full motion. Panels multiply durations by this. */
  scale: number;
  enabled: boolean;
}

const FULL: MotionProfile = {
  spring: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
  fast: { type: "spring", stiffness: 560, damping: 32, mass: 0.6 },
  soft: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  fade: { duration: 0.18 },
  scale: 1,
  enabled: true,
};

const REDUCED: MotionProfile = {
  spring: { type: "spring", stiffness: 700, damping: 42, mass: 0.5 },
  fast: { type: "spring", stiffness: 800, damping: 45, mass: 0.4 },
  soft: { type: "spring", stiffness: 600, damping: 45, mass: 0.5 },
  fade: { duration: 0.08 },
  scale: 0.35,
  enabled: true,
};

const OFF: MotionProfile = {
  spring: { type: "spring", stiffness: 1000, damping: 60, mass: 0.4 },
  fast: { type: "spring", stiffness: 1000, damping: 60, mass: 0.4 },
  soft: { type: "spring", stiffness: 1000, damping: 60, mass: 0.4 },
  fade: { duration: 0 },
  scale: 0,
  enabled: false,
};

/**
 * Central motion profile driven by the user's animation preference.
 *
 * "off" still animates (so state stays consistent) but collapses to ~0ms,
 * which is more predictable than conditionally stripping every transition.
 */
export function useMotionProfile(): MotionProfile {
  const animation = useBrowserStore((s) => s.settings.animation);
  return useMemo(() => {
    const base: MotionProfile =
      animation === "off" ? OFF : animation === "reduced" ? REDUCED : FULL;
    return base;
  }, [animation]);
}

/** True when the OS asks for reduced motion — used for a one-time nudge. */
export function usePrefersReducedMotion(): boolean {
  // NOTE: this must be a lazy useState, not a useMemo — a memoised array
  // literal would type `setReduced` as a boolean and break the listener.
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export const DENSITY_PX: Record<Density, { tab: number; row: number; bar: number }> = {
  compact: { tab: 30, row: 30, bar: 36 },
  comfortable: { tab: 36, row: 36, bar: 42 },
};

export type { AnimationIntensity, Density };
