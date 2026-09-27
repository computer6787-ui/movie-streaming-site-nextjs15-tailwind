import type { SearchEngineId } from "@/types/browser";

export interface SearchEngine {
  id: SearchEngineId;
  name: string;
  /** Template uses `{q}` for the encoded query. */
  template: string;
  suggestUrl?: string;
  /** Whether results pages commonly permit iframe embedding. */
  embeddable: boolean;
}

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngine> = {
  duckduckgo: {
    id: "duckduckgo",
    name: "DuckDuckGo",
    template: "https://duckduckgo.com/?q={q}",
    embeddable: true,
  },
  google: {
    id: "google",
    name: "Google",
    template: "https://www.google.com/search?q={q}",
    embeddable: false,
  },
  bing: {
    id: "bing",
    name: "Bing",
    template: "https://www.bing.com/search?q={q}",
    embeddable: false,
  },
  brave: {
    id: "brave",
    name: "Brave Search",
    template: "https://search.brave.com/search?q={q}",
    embeddable: true,
  },
  startpage: {
    id: "startpage",
    name: "Startpage",
    template: "https://www.startpage.com/sp/search?query={q}",
    embeddable: false,
  },
};

export const SEARCH_ENGINE_LIST = Object.values(SEARCH_ENGINES);

export const DEFAULT_SEARCH_ENGINE: SearchEngineId = "duckduckgo";

export function getEngine(id: SearchEngineId): SearchEngine {
  return SEARCH_ENGINES[id] ?? SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE];
}

export function searchUrl(engineId: SearchEngineId, query: string): string {
  return getEngine(engineId).template.replace("{q}", encodeURIComponent(query));
}
