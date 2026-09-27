/**
 * Blocking abstraction — types only.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HONESTY NOTE (please keep this file's spirit):
 *
 * A web page CANNOT observe, intercept or block the network requests made by a
 * cross-origin <iframe>. Those requests are issued by the *host browser*, in a
 * separate process, and are invisible to us by design. Therefore no web-based
 * "ad blocker" can honestly report "1,284 ads blocked".
 *
 * What Lumen *can* legitimately control is the set of URLs **it** loads into a
 * frame itself: our own new tab page, locally-rendered pages, and the decision
 * of whether to embed a given top-level URL at all. That is the entire scope of
 * this interface.
 *
 * A native/desktop or Android build can swap the IframeAdapter for a real
 * embedded engine (Chromium/WebView) plus a request interceptor, implement this
 * same `BlockingProvider` interface, and get genuine network-level filtering —
 * with zero changes to the UI above it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Where a given URL sits in the request pipeline we can actually see. */
export type RequestSurface =
  /** A top-level document Lumen is deciding whether to embed. */
  | "top-level-navigation"
  /** A subresource Lumen itself requested (favicon probe, internal route). */
  | "app-subresource"
  /** Traffic inside the cross-origin frame — NOT observable in web mode. */
  | "iframe-content";

export type RuleKind =
  /** Block anything matching. */
  | "block"
  /** Never block anything matching (overrides block rules). */
  | "allow";

export type RuleOrigin =
  /** Shipped as a sensible default by Lumen. */
  | "default"
  /** The user typed it. */
  | "user"
  /** Came from a list the user imported. */
  | "import";

export interface BlockingRule {
  id: string;
  /** Hostname pattern, e.g. "ads.example.com" or "*.tracker.net". */
  pattern: string;
  kind: RuleKind;
  origin: RuleOrigin;
  /** Optional user-facing label, e.g. "Ad servers". */
  category?: string;
  createdAt: number;
}

/**
 * A single *actually observed* decision. We only ever record what Lumen itself
 * evaluated — never a fabricated count of third-party traffic.
 */
export interface BlockEvent {
  url: string;
  surface: RequestSurface;
  ruleId: string;
  rulePattern: string;
  timestamp: number;
}

export interface BlockingDecision {
  blocked: boolean;
  rule?: BlockingRule;
  /** True when an allow rule overrode a block rule. */
  overriddenBy?: BlockingRule;
}

export interface BlockingStats {
  /** Decisions Lumen actually made on URLs it controls. */
  observed: number;
  blocked: number;
  allowed: number;
  /** Always true in web mode — stated in the UI, never faked. */
  networkInterceptionAvailable: false;
  surface: RequestSurface;
}

/** A per-surface view of the stats, so the UI can say what it is measuring. */
export interface BlockingProvider {
  readonly id: string;
  readonly label: string;
  /** True only when a real engine can intercept requests. False in web mode. */
  readonly canInterceptNetwork: boolean;

  /** Evaluate a URL against the rule set for the given surface. */
  evaluate(url: string, surface: RequestSurface): BlockingDecision;

  /** Convenience wrapper matching the minimal contract. */
  isBlocked(url: string): boolean;

  addRule(rule: string | Omit<BlockingRule, "id" | "createdAt">): void;
  removeRule(rule: string | string[]): void;

  addRules(rules: Array<string | Omit<BlockingRule, "id" | "createdAt">>): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;

  listRules(): BlockingRule[];
  allowlist(): string[];
  blocklist(): string[];

  /** Only ever contains entries for surfaces we can genuinely observe. */
  stats(): BlockingStats;
  recentEvents(limit?: number): BlockEvent[];

  subscribe(listener: () => void): () => void;
}
