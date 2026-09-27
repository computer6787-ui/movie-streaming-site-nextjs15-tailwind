/**
 * UI-only state: which panel is open, whether we are in full-screen content
 * mode, the transient address-bar focus ring, etc.
 *
 * Deliberately kept out of `useBrowserStore` so opening a panel can never
 * re-render the iframe layer.
 */

import { create } from "zustand";

export type PanelId = "history" | "bookmarks" | "privacy" | "settings" | "tabs" | null;

interface UIState {
  panel: PanelId;
  panelWidth: number;
  fullscreen: boolean;
  addressFocused: boolean;
  tabStripVisible: boolean;

  openPanel: (panel: PanelId) => void;
  closePanel: () => void;
  togglePanel: (panel: Exclude<PanelId, null>) => void;
  setFullscreen: (on: boolean) => void;
  toggleFullscreen: () => void;
  setAddressFocused: (on: boolean) => void;
  setTabStripVisible: (on: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  panel: null,
  panelWidth: 380,
  fullscreen: false,
  addressFocused: false,
  tabStripVisible: true,

  openPanel: (panel) => set({ panel, fullscreen: false }),
  closePanel: () => set({ panel: null }),
  togglePanel: (panel) =>
    set((s) => ({ panel: s.panel === panel ? null : panel, fullscreen: false })),
  setFullscreen: (on) => set({ fullscreen: on, panel: on ? null : get().panel }),
  toggleFullscreen: () =>
    set((s) => ({ fullscreen: !s.fullscreen, panel: !s.fullscreen ? null : s.panel })),
  setAddressFocused: (on) => set({ addressFocused: on }),
  setTabStripVisible: (on) => set({ tabStripVisible: on }),
}));
