"use client";

/**
 * Theme + density provider.
 *
 * Applies CSS custom properties on <html> so a theme change is a single style
 * write instead of a React re-render tree — which is why opening a settings
 * panel never disturbs the iframe.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import type { AccentId, Density, ThemeMode } from "@/types/browser";

interface ThemeCtx {
  resolved: "light" | "dark";
  mode: ThemeMode;
  accent: AccentId;
  density: Density;
}

const Ctx = createContext<ThemeCtx>({ resolved: "light", mode: "system", accent: "lumen", density: "comfortable" });

/** Accent definitions used for the address-bar focus glow and highlights. */
const ACCENTS: Record<AccentId, { light: [string, string]; dark: [string, string] }> = {
  lumen: { light: ["#4f46e5", "#7c3aed"], dark: ["#818cf8", "#a78bfa"] },
  violet: { light: ["#7c3aed", "#c026d3"], dark: ["#c084fc", "#e879f9"] },
  emerald: { light: ["#059669", "#0d9488"], dark: ["#34d399", "#2dd4bf"] },
  amber: { light: ["#d97706", "#ea580c"], dark: ["#fbbf24", "#fb923c"] },
  rose: { light: ["#e11d48", "#db2777"], dark: ["#fb7185", "#f472b6"] },
  sky: { light: ["#0284c7", "#2563eb"], dark: ["#38bdf8", "#60a5fa"] },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useBrowserStore((s) => s.settings.theme);
  const accent = useBrowserStore((s) => s.settings.accent);
  const density = useBrowserStore((s) => s.settings.density);
  const reduceTransparency = useBrowserStore((s) => s.settings.reduceTransparency);

  const systemDark = useSystemDark();

  const resolved: "light" | "dark" =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    root.dataset.density = density;
    root.dataset.transparency = reduceTransparency ? "off" : "on";
  }, [resolved, density, reduceTransparency]);

  useEffect(() => {
    const root = document.documentElement;
    // The accent is defined per colour scheme, so pick the pair that matches
    // the theme actually in use rather than the one Lumen was set to.
    const pair = ACCENTS[accent]?.[resolved] ?? ACCENTS.lumen[resolved];
    const [from, to] = pair;
    root.style.setProperty("--accent-from", from);
    root.style.setProperty("--accent-to", to);
  }, [accent, resolved]);

  const value = useMemo<ThemeCtx>(
    () => ({ resolved, mode, accent, density }),
    [resolved, mode, accent, density],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useSystemDark(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);

  const get = useCallback(() => window.matchMedia("(prefers-color-scheme: dark)").matches, []);

  return useSyncExternalStore(subscribe, get, () => false);
}

export function useTheme() {
  return useContext(Ctx);
}
