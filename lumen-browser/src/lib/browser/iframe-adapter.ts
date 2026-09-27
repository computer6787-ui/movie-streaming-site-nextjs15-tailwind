/**
 * IframeAdapter — the web implementation of `BrowserEngineAdapter`.
 *
 * Current pipeline:
 *     Browser UI  ->  IframeAdapter  ->  External Website
 *
 * It renders a plain cross-origin <iframe> and nothing more. It deliberately
 * does NOT:
 *   - touch iframe.contentDocument / contentWindow (cross-origin, and doing so
 *     would fail anyway),
 *   - inject scripts into the framed page,
 *   - proxy or re-host requests to defeat X-Frame-Options / CSP.
 *
 * A native build swaps this class for a Chromium/WebView adapter implementing
 * the same interface; everything above this line stays identical.
 */

import type { BrowserTab } from "@/types/browser";
import { getBlockingProvider } from "@/lib/blocking/provider";
import { isRenderable } from "./url";
import type { BrowserEngineAdapter, FrameState, NavigationOutcome } from "./engine";

/** Schemes Lumen renders itself rather than in a frame. */
const INTERNAL_SCHEMES = ["about:", "lumen:", "chrome:"];

export class IframeAdapter implements BrowserEngineAdapter {
  readonly id = "iframe" as const;
  readonly label = "Embedded frame (web)";
  /** We cannot read a cross-origin frame's URL or title. */
  readonly canInspectFrame = false;

  private listeners = new Set<(state: FrameState) => void>();

  resolve(target: string, _tab: Pick<BrowserTab, "id">): NavigationOutcome {
    if (!target) return { url: "", kind: "internal" };

    let protocol: string;
    try {
      protocol = new URL(target).protocol;
    } catch {
      return { url: target, kind: "internal" };
    }

    if (INTERNAL_SCHEMES.includes(protocol)) {
      return { url: target, kind: "internal" };
    }

    if (!isRenderable(protocol)) {
      return { url: target, kind: "internal" };
    }

    // A local rule can refuse to embed a host. This is a *site control* we
    // genuinely own — not a claim about network traffic.
    const decision = getBlockingProvider().evaluate(target, "top-level-navigation");
    if (decision.blocked && decision.rule) {
      return {
        url: target,
        kind: "blocked",
        blockedBy: { ruleId: decision.rule.id, pattern: decision.rule.pattern },
      };
    }

    return { url: target, kind: "iframe" };
  }

  onFrameState(cb: (state: FrameState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

let adapter: IframeAdapter | null = null;

export function getEngineAdapter(): IframeAdapter {
  if (!adapter) adapter = new IframeAdapter();
  return adapter;
}
