import type { MoyFilter, MoyTransaction, MoyTransactionInput, Page, PersonRelationshipSummary } from '../types/domain';
import * as backend from '../local-backend/transactions';
import { validateTransactionInput } from '../local-backend/validation';

export type { MoyFilter, MoyTransactionInput };

export async function createMoyTransaction(input: MoyTransactionInput): Promise<MoyTransaction> {
  return backend.createTransaction(input);
}

export interface BulkResult {
  ok: boolean;
  error?: string;
}

/**
 * Saves many rows. Invalid rows are reported individually; all valid rows are
 * saved together in a single write.
 */
export async function createMoyTransactionsBulk(inputs: MoyTransactionInput[]): Promise<BulkResult[]> {
  const results: BulkResult[] = inputs.map(() => ({ ok: false }));
  const validInputs: MoyTransactionInput[] = [];
  const validIndexes: number[] = [];

  inputs.forEach((input, i) => {
    try {
      validateTransactionInput(input);
      validInputs.push(input);
      validIndexes.push(i);
    } catch (e) {
      results[i] = { ok: false, error: e instanceof Error ? e.message : 'Invalid row' };
    }
  });

  if (validInputs.length > 0) {
    try {
      backend.createMany(validInputs);
      validIndexes.forEach((i) => { results[i] = { ok: true }; });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      validIndexes.forEach((i) => { results[i] = { ok: false, error: message }; });
    }
  }
  return results;
}

export async function updateMoyTransaction(id: number, input: MoyTransactionInput): Promise<MoyTransaction> {
  return backend.updateTransaction(id, input);
}

export async function deleteMoyTransaction(id: number): Promise<void> {
  backend.softDeleteTransaction(id);
}

export async function getPersonHistory(personName: string, page = 0, size = 20): Promise<Page<MoyTransaction>> {
  return backend.getPersonHistory(personName, page, size);
}

export async function getPersonSummary(personName: string): Promise<PersonRelationshipSummary> {
  return backend.getPersonSummary(personName);
}

export async function searchMoyTransactions(filter: MoyFilter): Promise<Page<MoyTransaction>> {
  return backend.searchTransactions(filter);
}

/** Distinct Place values already used — powers the Place autocomplete suggestions. */
export async function getMoyPlaces(): Promise<string[]> {
  return backend.getDistinctPlaces();
}
