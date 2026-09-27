/**
 * Tiny, defensive wrapper around `localStorage`.
 *
 * localStorage can be unavailable (Safari private mode, disabled cookies) and
 * can throw on quota. Every call is guarded so a storage failure degrades to
 * in-memory state instead of crashing the browser shell.
 */

type Fallback = Map<string, string>;

const memory: Fallback = new Map();
let warned = false;

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    const probe = `${":lumen:probe"}`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    if (!warned) {
      warned = true;
      console.warn(
        "[lumen] localStorage unavailable — session will not persist across reloads.",
      );
    }
    return null;
  }
}

export function readRaw(key: string): string | null {
  const store = getStore();
  if (!store) return memory.get(key) ?? null;
  try {
    return store.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  const store = getStore();
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* quota exceeded — keep the in-memory copy and move on */
  }
}

export function removeRaw(key: string): void {
  memory.delete(key);
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    writeRaw(key, JSON.stringify(value));
  } catch {
    /* value was not serialisable — ignore */
  }
}

export function removeKeys(keys: string[]): void {
  keys.forEach(removeRaw);
}

export function isStorageAvailable(): boolean {
  return getStore() !== null;
}
