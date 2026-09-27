/**
 * Local rules engine — the web-mode implementation of `BlockingProvider`.
 *
 * SCOPE, stated plainly: this engine only evaluates URLs that Lumen itself
 * decides to load (the top-level document we hand to a frame, and our own
 * subresources). It does NOT see a single request made *inside* a cross-origin
 * frame, because no page ever can.
 *
 * The returned stats therefore count only genuine, observed decisions. There is
 * no synthetic "ads blocked" counter anywhere in this codebase.
 */

import { readJSON, writeJSON, removeRaw } from "@/lib/storage/local";
import { StorageKeys, LEGACY_RULES_KEY } from "@/lib/storage/keys";
import { isHostPattern } from "@/lib/browser/url";
import type {
  BlockEvent,
  BlockingDecision,
  BlockingProvider,
  BlockingRule,
  BlockingStats,
  RequestSurface,
  RuleKind,
} from "./types";

// Registered in StorageKeys so "clear all local data" cannot miss it.
const STORAGE_KEY = StorageKeys.rules;
const MAX_EVENTS = 200;

/**
 * A conservative starter list of embed-blocking ad hosts. These only affect
 * sites Lumen would otherwise refuse to frame anyway, so the practical effect
 * in web mode is small — by design, not by accident.
 */
const DEFAULT_RULES: Array<Pick<BlockingRule, "pattern" | "category">> = [
  { pattern: "doubleclick.net", category: "Ad servers" },
  { pattern: "googlesyndication.com", category: "Ad servers" },
  { pattern: "adservice.google.com", category: "Ad servers" },
  { pattern: "adnxs.com", category: "Ad networks" },
  { pattern: "criteo.com", category: "Ad networks" },
  { pattern: "rubiconproject.com", category: "Ad networks" },
  { pattern: "outbrain.com", category: "Recommendation widgets" },
  { pattern: "taboola.com", category: "Recommendation widgets" },
  { pattern: "hotjar.com", category: "Session analytics" },
  { pattern: "segment.io", category: "Session analytics" },
];

/** Match a hostname against a rule pattern ("*.foo.com" / "foo.com"). */
export function matchesPattern(hostname: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (!p) return false;
  const host = hostname.toLowerCase();

  if (p.startsWith("*.")) {
    const base = p.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }
  return host === p || host.endsWith(`.${p}`);
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function makeId(): string {
  return `r_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

interface PersistedRules {
  rules: BlockingRule[];
  enabled: boolean;
}

/**
 * Rebuild rules read back from storage, which is untrusted input.
 *
 * Persisted rules may be missing fields, or come from a build with a different
 * shape. Anything we cannot recognise as a usable pattern is dropped rather
 * than carried into the live rule set.
 */
function reviveLegacyRules(raw: unknown): PersistedRules | null {
  if (raw === null || typeof raw !== "object") return null;

  const envelope = raw as { rules?: unknown; enabled?: unknown };
  const list = Array.isArray(raw) ? raw : Array.isArray(envelope.rules) ? envelope.rules : [];
  if (list.length === 0) return null;

  const seen = new Set<string>();
  const rules: BlockingRule[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<BlockingRule>;
    const pattern = typeof candidate.pattern === "string" ? candidate.pattern.trim().toLowerCase() : "";
    if (!pattern || !isHostPattern(pattern) || seen.has(pattern)) continue;
    seen.add(pattern);
    rules.push({
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : makeId(),
      pattern,
      kind: candidate.kind === "allow" ? "allow" : "block",
      origin: candidate.origin === "user" ? "user" : "default",
      category: typeof candidate.category === "string" ? candidate.category : "Imported",
      createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    });
  }
  if (rules.length === 0) return null;

  return { rules, enabled: envelope.enabled !== false };
}

class LocalRulesEngine implements BlockingProvider {
  readonly id = "local-rules";
  readonly label = "Local rules engine";
  readonly canInterceptNetwork = false as const;

  private rules: BlockingRule[] = [];
  private events: BlockEvent[] = [];
  private enabled = true;
  private observed = 0;
  private blocked = 0;
  private allowed = 0;
  private listeners = new Set<() => void>();
  private hydrated = false;

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    const stored = readJSON<PersistedRules | null>(STORAGE_KEY, null);

    if (stored?.rules?.length) {
      this.rules = stored.rules;
      this.enabled = stored.enabled !== false;
      return;
    }

    // Older builds kept rules under `lumen:v1:settings:rules`, either as the
    // same {rules, enabled} envelope or as a bare array. Rescue a user's custom
    // rules before falling back to the shipped defaults, then delete the old key
    // so the migration runs at most once.
    const legacy = readJSON<unknown>(LEGACY_RULES_KEY, null);
    const salvaged = reviveLegacyRules(legacy);
    if (salvaged?.rules.length) {
      this.rules = salvaged.rules;
      this.enabled = salvaged.enabled !== false;
      removeRaw(LEGACY_RULES_KEY);
      this.persist();
      return;
    }
    if (legacy !== null) removeRaw(LEGACY_RULES_KEY);

    this.rules = DEFAULT_RULES.map((r) => ({
      id: makeId(),
      pattern: r.pattern,
      kind: "block" as RuleKind,
      origin: "default" as const,
      category: r.category,
      createdAt: Date.now(),
    }));
    this.persist();
  }

  private persist(): void {
    writeJSON(STORAGE_KEY, { rules: this.rules, enabled: this.enabled } satisfies PersistedRules);
  }

  private emit(): void {
    this.persist();
    this.listeners.forEach((l) => l());
  }

  evaluate(url: string, surface: RequestSurface): BlockingDecision {
    // Only surfaces Lumen genuinely controls are ever evaluated.
    if (surface === "iframe-content") return { blocked: false };

    this.observed += 1;
    const host = hostnameOf(url);

    if (!this.enabled || !host) {
      this.allowed += 1;
      return { blocked: false };
    }

    const allowRule = this.rules.find(
      (r) => r.kind === "allow" && matchesPattern(host, r.pattern),
    );
    if (allowRule) {
      this.allowed += 1;
      return { blocked: false, overriddenBy: allowRule };
    }

    const blockRule = this.rules.find(
      (r) => r.kind === "block" && matchesPattern(host, r.pattern),
    );
    if (blockRule) {
      this.blocked += 1;
      this.record({
        url,
        surface,
        ruleId: blockRule.id,
        rulePattern: blockRule.pattern,
        timestamp: Date.now(),
      });
      return { blocked: true, rule: blockRule };
    }

    this.allowed += 1;
    return { blocked: false };
  }

  private record(event: BlockEvent): void {
    this.events = [event, ...this.events].slice(0, MAX_EVENTS);
  }

  isBlocked(url: string): boolean {
    return this.evaluate(url, "top-level-navigation").blocked;
  }

  addRule(rule: string | Omit<BlockingRule, "id" | "createdAt">): void {
    // Normalise to a full rule up front so the union from the two accepted call
    // shapes does not leak into the rest of the method.
    type RuleInput = Omit<BlockingRule, "id" | "createdAt" | "origin"> &
      Partial<Pick<BlockingRule, "origin">>;

    const input: RuleInput =
      typeof rule === "string"
        ? { pattern: rule, kind: "block" }
        : { ...rule, kind: rule.kind };

    const pattern = input.pattern.trim().toLowerCase();
    if (!pattern) return;

    const kind: RuleKind = input.kind ?? "block";
    if (this.rules.some((r) => r.pattern === pattern && r.kind === kind)) return;

    this.rules = [
      ...this.rules,
      {
        id: makeId(),
        origin: "user",
        createdAt: Date.now(),
        ...input,
        pattern,
        kind,
      },
    ];
    this.emit();
  }

  addRules(rules: Array<string | Omit<BlockingRule, "id" | "createdAt">>): void {
    rules.forEach((r) => this.addRule(r));
  }

  removeRule(rule: string | string[]): void {
    const ids = Array.isArray(rule) ? rule : [rule];
    this.rules = this.rules.filter((r) => !ids.includes(r.id) && !ids.includes(r.pattern));
    this.emit();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  listRules(): BlockingRule[] {
    return [...this.rules].sort((a, b) => a.pattern.localeCompare(b.pattern));
  }

  allowlist(): string[] {
    return this.rules.filter((r) => r.kind === "allow").map((r) => r.pattern);
  }

  blocklist(): string[] {
    return this.rules.filter((r) => r.kind === "block").map((r) => r.pattern);
  }

  stats(): BlockingStats {
    return {
      observed: this.observed,
      blocked: this.blocked,
      allowed: this.allowed,
      networkInterceptionAvailable: false,
      surface: "top-level-navigation",
    };
  }

  recentEvents(limit = 20): BlockEvent[] {
    return this.events.slice(0, limit);
  }

  resetStats(): void {
    this.observed = 0;
    this.blocked = 0;
    this.allowed = 0;
    this.events = [];
    this.emit();
  }

  /**
   * Drop every user rule and restore the shipped defaults.
   *
   * The engine keeps rules in memory as well as in storage, so a storage wipe
   * alone would leave the deleted rules live until the next page load. The
   * Privacy panel calls this after "clear all data" so the UI, this engine and
   * localStorage all agree.
   */
  resetRules(): void {
    this.hydrate();
    this.rules = DEFAULT_RULES.map((r) => ({
      id: makeId(),
      pattern: r.pattern,
      kind: "block" as RuleKind,
      origin: "default" as const,
      category: r.category,
      createdAt: Date.now(),
    }));
    this.enabled = true;
    this.resetStats();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/**
 * A provider that is completely inert — used by the Privacy panel to show
 * exactly what "not available in web mode" means.
 */
export class UnavailableBlockingProvider implements BlockingProvider {
  readonly id = "unavailable";
  readonly label = "Network-level blocking (unavailable in web mode)";
  readonly canInterceptNetwork = false as const;

  evaluate(): BlockingDecision {
    return { blocked: false };
  }
  isBlocked(): boolean {
    return false;
  }
  addRule(): void {}
  removeRule(): void {}
  addRules(): void {}
  setEnabled(): void {}
  isEnabled(): boolean {
    return false;
  }
  listRules(): BlockingRule[] {
    return [];
  }
  allowlist(): string[] {
    return [];
  }
  blocklist(): string[] {
    return [];
  }
  stats(): BlockingStats {
    return {
      observed: 0,
      blocked: 0,
      allowed: 0,
      networkInterceptionAvailable: false,
      surface: "top-level-navigation",
    };
  }
  recentEvents(): BlockEvent[] {
    return [];
  }
  subscribe(): () => void {
    return () => {};
  }
}

let singleton: LocalRulesEngine | null = null;

export function getBlockingProvider(): LocalRulesEngine {
  if (!singleton) singleton = new LocalRulesEngine();
  return singleton;
}
