/**
 * The native-engine bridge, as seen by the renderer.
 *
 * Declared globally because the preload script attaches to `window` under this
 * one name. When Lumen runs as a plain web page (the iframe build) this object
 * is simply absent, and `isNativeRuntime()` returns false.
 */

export interface DecisionLogEntry {
  id: string;
  level: "allow" | "block";
  surface: "REQUEST" | "POPUP" | "NAVIGATION";
  url: string;
  reason: string;
  pattern?: string;
  resourceType?: string;
  at: number;
}

export interface NativeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeTabState {
  tabId: string;
  url?: string;
  title?: string;
  favicon?: string;
  status?: "loading" | "ready" | "error";
  error?: { code: number; message: string; url: string };
}

export interface NativeEngine {
  available: true;
  engineAvailable(): Promise<boolean>;
  attachTab(tabId: string, bounds: NativeBounds): Promise<{ viewId: string }>;
  loadTab(tabId: string, url: string): Promise<void>;
  setBounds(tabId: string, bounds: NativeBounds): Promise<void>;
  destroyTab(tabId: string): Promise<void>;
  goBack(tabId: string): Promise<void>;
  goForward(tabId: string): Promise<void>;
  reload(tabId: string): Promise<void>;
  stop(tabId: string): Promise<void>;
  getGuardConfig(): Promise<{
    enabled: boolean;
    allowlist: string[];
    blocklist: string[];
    blockUrlSignatures: boolean;
  }>;
  setGuardConfig(next: Partial<{
    enabled: boolean;
    allowlist: string[];
    blocklist: string[];
    blockUrlSignatures: boolean;
  }>): Promise<unknown>;
  onDecision(cb: (entry: DecisionLogEntry) => void): () => void;
  onTabState(cb: (state: NativeTabState) => void): () => void;
  onOpenNewTab(cb: (payload: { url: string }) => void): () => void;
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    lumenNative?: NativeEngine;
  }
}

export {};
