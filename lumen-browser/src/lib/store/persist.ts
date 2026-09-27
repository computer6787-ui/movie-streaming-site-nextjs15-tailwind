/**
 * Persistence helpers for the browser store.
 *
 * History is the one dataset large enough to belong in IndexedDB; everything
 * else is small JSON in localStorage. All of it is namespaced under
 * `lumen:v1:*` so "clear all local data" is exact and reversible-safe.
 */

import type { Bookmark, BookmarkFolder, BrowserTab, BrowserTabId, ClosedTab, HistoryEntry, Settings } from "@/types/browser";
import { ALL_STORAGE_KEYS, HISTORY_LIMIT, StorageKeys } from "@/lib/storage/keys";
import { readJSON, removeKeys, writeJSON } from "@/lib/storage/local";
import { idbAll, idbClear, idbDelete, idbPut, idbPutMany, isIdbAvailable } from "@/lib/storage/idb";
import { SESSION_VERSION, DEFAULT_SETTINGS } from "./defaults";

export const persistSettings = (s: Settings): void => writeJSON(StorageKeys.settings, s);
export const persistBookmarks = (b: Bookmark[]): void => writeJSON(StorageKeys.bookmarks, b);
export const persistFolders = (f: BookmarkFolder[]): void => writeJSON(StorageKeys.folders, f);
export const persistClosedTabs = (c: ClosedTab[]): void => writeJSON(StorageKeys.closedTabs, c);

export const persistSession = (tabs: BrowserTab[], activeTabId: BrowserTabId | null): void =>
  writeJSON(StorageKeys.session, {
    version: SESSION_VERSION,
    tabs,
    activeTabId,
    closedTabs: [],
    savedAt: Date.now(),
  });

export interface LoadedSession {
  version: number;
  tabs: BrowserTab[];
  activeTabId: BrowserTabId | null;
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(StorageKeys.settings, {}) };
}

export function loadBookmarks(): Bookmark[] {
  return readJSON<Bookmark[]>(StorageKeys.bookmarks, []);
}
export function loadFolders(): BookmarkFolder[] {
  return readJSON<BookmarkFolder[]>(StorageKeys.folders, []);
}
export function loadClosedTabs(): ClosedTab[] {
  return readJSON<ClosedTab[]>(StorageKeys.closedTabs, []);
}
export function loadSession(): LoadedSession | null {
  return readJSON<LoadedSession | null>(StorageKeys.session, null);
}

/** Read history: prefer IndexedDB, fall back to (and migrate) localStorage. */
export async function loadHistory(): Promise<HistoryEntry[]> {
  let history: HistoryEntry[] = readJSON<HistoryEntry[]>(StorageKeys.history, []);
  if (!isIdbAvailable()) return history;

  try {
    const records = await idbAll();
    const fromIdb = records
      .map((r) => r.value as HistoryEntry)
      .filter((h) => h && typeof h.url === "string");
    if (fromIdb.length) {
      history = fromIdb.sort((a, b) => b.timestamp - a.timestamp);
    } else if (history.length) {
      await idbPutMany(history.map((h) => ({ id: h.id, value: h })));
    }
  } catch {
    /* keep whatever localStorage gave us */
  }
  return history;
}

export async function appendHistory(entry: HistoryEntry, previous: HistoryEntry[]): Promise<HistoryEntry[]> {
  const rest = previous.filter((h) => h.url !== entry.url);
  const next = [entry, ...rest].slice(0, HISTORY_LIMIT);
  if (isIdbAvailable()) await idbPut({ id: entry.id, value: entry }).catch(() => {});
  return next;
}

export async function dropHistoryEntry(id: string): Promise<void> {
  if (isIdbAvailable()) await idbDelete(id).catch(() => {});
}

export async function wipeHistory(): Promise<void> {
  if (isIdbAvailable()) await idbClear().catch(() => {});
}

export function wipeAllLocalStorage(): void {
  removeKeys(ALL_STORAGE_KEYS);
}

export async function wipeEverything(): Promise<void> {
  wipeAllLocalStorage();
  if (isIdbAvailable()) await idbClear().catch(() => {});
}
