/**
 * Central registry of every local storage key Lumen writes.
 *
 * Everything here is namespaced so "clear all local browser data" is a single
 * sweep and can never touch unrelated keys on the origin.
 */
export const STORAGE_PREFIX = "lumen:v1";

export const StorageKeys = {
  settings: `${STORAGE_PREFIX}:settings`,
  bookmarks: `${STORAGE_PREFIX}:bookmarks`,
  folders: `${STORAGE_PREFIX}:folders`,
  history: `${STORAGE_PREFIX}:history`,
  session: `${STORAGE_PREFIX}:session`,
  closedTabs: `${STORAGE_PREFIX}:closed`,
  favourites: `${STORAGE_PREFIX}:favourites`,
  /** Blocking rules + their enabled flag, owned by the rules engine. */
  rules: `${STORAGE_PREFIX}:rules`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/**
 * Keys written by earlier builds that are no longer part of the registry.
 *
 * They are deliberately NOT in `ALL_STORAGE_KEYS`: that list drives "clear all
 * Lumen data", and sweeping keys we no longer read would be guessing. Migration
 * removes them one at a time, at the point that knows they are safe to drop.
 */
export const LEGACY_RULES_KEY = `${STORAGE_PREFIX}:settings:rules`;

export const ALL_STORAGE_KEYS: StorageKey[] = Object.values(StorageKeys);

/** How many local history entries we keep before pruning the oldest. */
export const HISTORY_LIMIT = 2000;
