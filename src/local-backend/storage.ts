import type { MoyTransaction } from '../types/domain';

/** A transaction as persisted: the public shape plus soft-delete flag and audit timestamps. */
export interface StoredTransaction extends MoyTransaction {
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreData {
  version: 1;
  nextId: number;
  transactions: StoredTransaction[];
}

export class StorageError extends Error {}

export const STORAGE_KEY = 'moy.transactions.v1';
const CORRUPT_KEY = 'moy.transactions.v1.corrupt';

let cache: StoreData | null = null;

// Another tab may write to the same storage; drop our cache when it does.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) cache = null;
  });
}

function emptyStore(): StoreData {
  return { version: 1, nextId: 1, transactions: [] };
}

function isStoredTransaction(v: unknown): v is StoredTransaction {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.transactionId === 'number' &&
    typeof t.personName === 'string' &&
    (t.transactionType === 'GIVEN' || t.transactionType === 'RECEIVED') &&
    typeof t.amount === 'number' &&
    typeof t.paymentMode === 'string' &&
    typeof t.transactionDate === 'string' &&
    typeof t.deleted === 'boolean'
  );
}

export function isStoreData(v: unknown): v is StoreData {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    s.version === 1 &&
    typeof s.nextId === 'number' &&
    Array.isArray(s.transactions) &&
    s.transactions.every(isStoredTransaction)
  );
}

function normalise(data: StoreData): StoreData {
  const maxId = data.transactions.reduce((m, t) => Math.max(m, t.transactionId), 0);
  return { ...data, nextId: Math.max(data.nextId, maxId + 1) };
}

export function readStore(): StoreData {
  if (cache) return cache;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new StorageError('Browser storage is unavailable. Check that cookies/site data are allowed.');
  }
  if (!raw) {
    cache = emptyStore();
    return cache;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoreData(parsed)) throw new Error('bad shape');
    cache = normalise(parsed);
  } catch {
    // Never silently discard unreadable data: keep a copy before starting fresh.
    try { localStorage.setItem(CORRUPT_KEY, raw); } catch { /* best effort */ }
    cache = emptyStore();
  }
  return cache;
}

export function writeStore(data: StoreData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    cache = null;
    throw new StorageError('Could not save: browser storage is full or unavailable.');
  }
  cache = data;
}

export function replaceStore(data: StoreData): void {
  writeStore(normalise(data));
}

export function resetStore(): void {
  writeStore(emptyStore());
}
