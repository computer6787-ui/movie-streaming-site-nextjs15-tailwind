/**
 * Public entry point for blocking.
 *
 * `getBlockingProvider()` is the only thing the UI should import. Swapping in a
 * native engine is a one-line change here:
 *
 *   if (isNative()) return new NativeEngineAdapter();
 */

export {
  getBlockingProvider,
  matchesPattern,
  UnavailableBlockingProvider,
} from "./rules-engine";

export type {
  BlockEvent,
  BlockingDecision,
  BlockingProvider,
  BlockingRule,
  BlockingStats,
  RequestSurface,
  RuleKind,
  RuleOrigin,
} from "./types";
