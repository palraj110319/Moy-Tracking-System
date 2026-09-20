import type {
  MoyFilter, MoyTransaction, MoyTransactionInput, Page, PersonRelationshipSummary,
} from '../types/domain';
import { fromPaise, toPaise } from './money';
import { readStore, writeStore, type StoredTransaction } from './storage';
import { validateTransactionInput } from './validation';

export const DEFAULT_PAGE_SIZE = 20;

export class NotFoundError extends Error {}

const nowIso = () => new Date().toISOString();

export function toResponse(t: StoredTransaction): MoyTransaction {
  return {
    transactionId: t.transactionId,
    personName: t.personName,
    transactionType: t.transactionType,
    amount: t.amount,
    paymentMode: t.paymentMode,
    transactionDate: t.transactionDate,
    place: t.place,
    notes: t.notes,
  };
}

/** All non-deleted transactions. Deleted ones stay in storage for history but never appear in views. */
export function listActive(): StoredTransaction[] {
  return readStore().transactions.filter((t) => !t.deleted);
}

function newestFirst(a: StoredTransaction, b: StoredTransaction): number {
  if (a.transactionDate !== b.transactionDate) return a.transactionDate < b.transactionDate ? 1 : -1;
  return b.transactionId - a.transactionId;
}

function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const safeSize = size > 0 ? size : DEFAULT_PAGE_SIZE;
  const safePage = page >= 0 ? page : 0;
  const totalPages = Math.ceil(items.length / safeSize);
  return {
    content: items.slice(safePage * safeSize, safePage * safeSize + safeSize),
    totalElements: items.length,
    totalPages,
    number: safePage,
    size: safeSize,
  };
}

function findActiveOrThrow(id: number): StoredTransaction {
  const found = readStore().transactions.find((t) => t.transactionId === id);
  if (!found) throw new NotFoundError(`Transaction ${id} not found`);
  if (found.deleted) throw new NotFoundError(`Transaction ${id} has already been deleted`);
  return found;
}

export function createTransaction(input: MoyTransactionInput): MoyTransaction {
  return createMany([input])[0];
}

/** Validates every row first, then saves them in a single write (all-or-nothing). */
export function createMany(inputs: MoyTransactionInput[]): MoyTransaction[] {
  const cleaned = inputs.map(validateTransactionInput);
  const store = readStore();
  const stamp = nowIso();
  let nextId = store.nextId;
  const created: StoredTransaction[] = cleaned.map((c) => ({
    ...c,
    transactionId: nextId++,
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  writeStore({ ...store, nextId, transactions: [...store.transactions, ...created] });
  return created.map(toResponse);
}

export function updateTransaction(id: number, input: MoyTransactionInput): MoyTransaction {
  const cleaned = validateTransactionInput(input);
  const store = readStore();
  const existing = findActiveOrThrow(id);
  const updated: StoredTransaction = { ...existing, ...cleaned, updatedAt: nowIso() };
  writeStore({
    ...store,
    transactions: store.transactions.map((t) => (t.transactionId === id ? updated : t)),
  });
  return toResponse(updated);
}

/** Soft delete: the record is flagged, never removed, so history is preserved. */
export function softDeleteTransaction(id: number): void {
  const store = readStore();
  findActiveOrThrow(id);
  const transactions = store.transactions.map((t) =>
    t.transactionId === id ? { ...t, deleted: true, updatedAt: nowIso() } : t
  );
  writeStore({ ...store, transactions });
}

export function searchTransactions(filter: MoyFilter): Page<MoyTransaction> {
  const name = filter.personName?.trim().toLowerCase();
  const place = filter.place?.trim().toLowerCase();
  const rows = listActive()
    .filter((t) => !name || t.personName.toLowerCase().includes(name))
    .filter((t) => !filter.transactionType || t.transactionType === filter.transactionType)
    .filter((t) => !filter.paymentMode || t.paymentMode === filter.paymentMode)
    .filter((t) => !filter.fromDate || t.transactionDate >= filter.fromDate)
    .filter((t) => !filter.toDate || t.transactionDate <= filter.toDate)
    .filter((t) => filter.minAmount === undefined || t.amount >= filter.minAmount)
    .filter((t) => filter.maxAmount === undefined || t.amount <= filter.maxAmount)
    .filter((t) => !place || (t.place ?? '').toLowerCase().includes(place))
    .sort(newestFirst)
    .map(toResponse);
  return paginate(rows, filter.page ?? 0, filter.size ?? DEFAULT_PAGE_SIZE);
}

/** Exact-name history between "Me" and one person, newest first. */
export function getPersonHistory(personName: string, page = 0, size = DEFAULT_PAGE_SIZE): Page<MoyTransaction> {
  const rows = listActive()
    .filter((t) => t.personName === personName)
    .sort(newestFirst)
    .map(toResponse);
  return paginate(rows, page, size);
}

/**
 * Relationship summary derived dynamically from history. Neutral by design:
 * a difference is never treated as a debt, and matching amounts never imply
 * a transaction was "returned".
 */
export function getPersonSummary(personName: string): PersonRelationshipSummary {
  const rows = listActive().filter((t) => t.personName === personName);
  const givenPaise = rows.filter((t) => t.transactionType === 'GIVEN').reduce((s, t) => s + toPaise(t.amount), 0);
  const receivedPaise = rows.filter((t) => t.transactionType === 'RECEIVED').reduce((s, t) => s + toPaise(t.amount), 0);
  const lastDate = rows.reduce<string | undefined>(
    (max, t) => (max === undefined || t.transactionDate > max ? t.transactionDate : max), undefined);

  let status: PersonRelationshipSummary['status'];
  if (givenPaise === 0 && receivedPaise === 0) status = 'NO_TRANSACTIONS';
  else if (givenPaise > receivedPaise) status = 'GIVEN_MORE';
  else if (receivedPaise > givenPaise) status = 'RECEIVED_MORE';
  else status = 'BALANCED';

  return {
    personName,
    totalGiven: fromPaise(givenPaise),
    totalReceived: fromPaise(receivedPaise),
    difference: fromPaise(Math.abs(givenPaise - receivedPaise)),
    status,
    lastTransactionDate: lastDate,
    reciprocalTransactionsObserved:
      rows.some((t) => t.transactionType === 'GIVEN') && rows.some((t) => t.transactionType === 'RECEIVED'),
  };
}

/** Distinct, non-blank places already used — feeds the Place autocomplete. */
export function getDistinctPlaces(): string[] {
  const places = new Set<string>();
  for (const t of listActive()) if (t.place) places.add(t.place);
  return Array.from(places).sort((a, b) => a.localeCompare(b));
}
