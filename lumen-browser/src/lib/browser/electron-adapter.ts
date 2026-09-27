/**
 * ElectronAdapter — the Chromium implementation of `BrowserEngineAdapter`.
 *
 * This is the primary desktop engine. It satisfies the SAME interface the
 * iframe build implements, which is the entire point of that seam: the store
 * calls `adapter.resolve()` exactly as before, and the UI picks a view layer by
 * `adapter.id`. Neither knows which engine is underneath.
 *
 * Where the real work happens: the renderer never inspects or filters anything
 * itself. It asks the main process to load a URL into a `WebContentsView`, and
 * the guards in `electron/guards.ts` do the actual interception inside Chromium.
 */

import type { BrowserTab } from "@/types/browser";
import type {
  DecisionLogEntry,
  NativeBounds,
  NativeEngine,
  NativeTabState,
} from "@/types/native";
import { getBlockingProvider } from "@/lib/blocking/provider";
import type { BrowserEngineAdapter, FrameState, NavigationOutcome } from "./engine";

function native(): NativeEngine | null {
  if (typeof window === "undefined") return null;
  return window.lumenNative ?? null;
}

/** True when running inside the Electron shell rather than a plain browser. */
export function isNativeRuntime(): boolean {
  return native() !== null;
}

/** Schemes Lumen renders itself rather than handing to Chromium. */
const INTERNAL_SCHEMES = ["about:", "lumen:", "chrome:"];

export class ElectronAdapter implements BrowserEngineAdapter {
  readonly id = "chromium" as const;
  readonly label = "Chromium engine (Electron)";
  /**
   * True: we own a real renderer, so titles, favicons and in-page URLs are
   * genuinely observable — a capability the iframe build honestly lacks.
   */
  readonly canInspectFrame = true;

  private listeners = new Set<(state: FrameState) => void>();

  constructor() {
    const engine = native();
    if (!engine) return;

    // A real renderer, so this is a genuine observation rather than a guess.
    engine.onTabState((state: NativeTabState) => {
      const frame: FrameState = { canReadUrl: true };
      if (state.title) frame.title = state.title;
      if (state.favicon) frame.favicon = state.favicon;
      this.listeners.forEach((cb) => cb(frame));
    });
  }

  /**
   * Decide what happens for a top-level URL.
   *
   * Same contract as the iframe adapter. A user blocklist hit is still
   * reported here as `blocked`, so the UI can show the existing "blocked by
   * your local rule" page instead of loading a tab that then refuses to render.
   * Everything else is handed to Chromium, which applies the real filters.
   */
  resolve(target: string, _tab: Pick<BrowserTab, "id">): NavigationOutcome {
    if (!target) return { url: "", kind: "internal" };

    let protocol: string;
    try {
      protocol = new URL(target).protocol;
    } catch {
      return { url: target, kind: "internal" };
    }

    if (INTERNAL_SCHEMES.includes(protocol)) return { url: target, kind: "internal" };
    if (protocol !== "http:" && protocol !== "https:") {
      return { url: target, kind: "internal" };
    }

    // Reuse the user's own rules — the same source the iframe adapter consults,
    // so both engines honour the Privacy panel identically.
    const decision = getBlockingProvider().evaluate(target, "top-level-navigation");
    if (decision.blocked && decision.rule) {
      return {
        url: target,
        kind: "blocked",
        blockedBy: { ruleId: decision.rule.id, pattern: decision.rule.pattern },
      };
    }

    return { url: target, kind: "native" };
  }

  onFrameState(cb: (state: FrameState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /* ------------------------------------------------------- engine commands */

  attachTab(tabId: string, bounds: NativeBounds): void {
    void native()?.attachTab(tabId, bounds);
  }

  loadTab(tabId: string, url: string): void {
    void native()?.loadTab(tabId, url);
  }

  setBounds(tabId: string, bounds: NativeBounds): void {
    void native()?.setBounds(tabId, bounds);
  }

  destroyTab(tabId: string): void {
    void native()?.destroyTab(tabId);
  }

  goBack(tabId: string): void {
    void native()?.goBack(tabId);
  }

  goForward(tabId: string): void {
    void native()?.goForward(tabId);
  }

  reload(tabId: string): void {
    void native()?.reload(tabId);
  }

  stop(tabId: string): void {
    void native()?.stop(tabId);
  }

  /** Push the user's Privacy-panel rules down to the native guards. */
  async syncConfig(): Promise<void> {
    const engine = native();
    if (!engine) return;
    const provider = getBlockingProvider();
    await engine.setGuardConfig({
      enabled: provider.isEnabled(),
      allowlist: provider.allowlist(),
      blocklist: provider.blocklist(),
    });
  }

  openExternal(url: string): void {
    const engine = native();
    if (engine) void engine.openExternal(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  }
}

let singleton: ElectronAdapter | null = null;

export function getElectronAdapter(): ElectronAdapter {
  if (!singleton) singleton = new ElectronAdapter();
  return singleton;
}
