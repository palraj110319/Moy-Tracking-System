import { downloadBlob } from './download';
import { isStoreData, readStore, replaceStore, resetStore } from './storage';
import { todayIso } from '../utils/format';

/** Full copy of the data (including soft-deleted records) as a JSON file. */
export function exportBackup(): number {
  const store = readStore();
  downloadBlob(
    new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }),
    `moy-backup-${todayIso()}.json`
  );
  return store.transactions.filter((t) => !t.deleted).length;
}

/** Replaces all current data with the contents of a backup file. Returns the active record count. */
export async function restoreBackup(file: File): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isStoreData(parsed)) throw new Error('This file is not a valid Moy Tracker backup.');
  replaceStore(parsed);
  return parsed.transactions.filter((t) => !t.deleted).length;
}

export function clearAllData(): void {
  resetStore();
}
