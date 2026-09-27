import type { Settings } from "@/types/browser";
import { DEFAULT_SEARCH_ENGINE } from "@/lib/search/engines";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accent: "lumen",
  density: "comfortable",
  animation: "full",
  reduceTransparency: false,

  searchEngine: DEFAULT_SEARCH_ENGINE,
  searchInAddressBar: true,

  homepage: "https://example.com",
  startup: "restore-tabs",
  newTabBehavior: "new-tab-page",

  blockingEnabled: true,
  allowlist: [],
  blocklist: [],
};

export const SESSION_VERSION = 1;
export const MAX_CLOSED_TABS = 25;

export function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function emptySession() {
  return { entries: [] as string[], index: -1 };
}
