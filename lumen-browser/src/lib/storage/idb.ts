/**
 * Minimal promise wrapper around IndexedDB.
 *
 * Used for the larger local datasets (history). The same public API can be
 * re-pointed at a native/desktop store later, so nothing in the app talks to
 * IndexedDB directly.
 */

const DB_NAME = "lumen";
const DB_VERSION = 1;
const HISTORY_STORE = "history";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });

  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE, mode);
        const request = run(transaction.objectStore(HISTORY_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

export interface StoredRecord {
  id: string;
  value: unknown;
}

export async function idbPut(record: StoredRecord): Promise<void> {
  await tx("readwrite", (s) => s.put(record) as IDBRequest<IDBValidKey>);
}

export async function idbPutMany(records: StoredRecord[]): Promise<void> {
  if (!records.length) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(HISTORY_STORE, "readwrite");
    const store = t.objectStore(HISTORY_STORE);
    records.forEach((r) => store.put(r));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error("bulk put failed"));
  });
}

export async function idbAll(): Promise<StoredRecord[]> {
  return tx("readonly", (s) => s.getAll() as IDBRequest<StoredRecord[]>);
}

export async function idbDelete(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export async function idbClear(): Promise<void> {
  await tx("readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

export function isIdbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
