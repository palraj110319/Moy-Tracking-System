import { clearAllData, exportBackup, restoreBackup } from '../local-backend/backup';
import { exportTransactionsToExcel } from '../local-backend/exports';
import { searchTransactions } from '../local-backend/transactions';
import type { MoyFilter } from '../types/domain';

export function downloadBackup(): number {
  return exportBackup();
}

export function restoreFromBackup(file: File): Promise<number> {
  return restoreBackup(file);
}

export function eraseAllData(): void {
  clearAllData();
}

/** Exports every transaction matching the filter (all pages) to an Excel file. Returns the row count. */
export async function exportTransactionsExcel(filter: MoyFilter): Promise<number> {
  const result = searchTransactions({ ...filter, page: 0, size: Number.MAX_SAFE_INTEGER });
  await exportTransactionsToExcel(result.content);
  return result.totalElements;
}

export async function getRecordCount(): Promise<number> {
  return searchTransactions({ page: 0, size: 1 }).totalElements;
}
