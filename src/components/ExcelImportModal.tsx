import React, { useState } from 'react';
import type { MoyTransactionInput, PaymentMode, TransactionType } from '../types/domain';
import { createMoyTransactionsBulk } from '../api/moyApi';
import { todayIso } from '../utils/format';
import { Modal } from './Modal';
import { useToast } from './Toast';

const VALID_TYPES: TransactionType[] = ['GIVEN', 'RECEIVED'];
const VALID_PAYMENT_MODES: PaymentMode[] = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];

const EXPECTED_COLUMNS = ['Person Name', 'Type', 'Amount', 'Payment Mode', 'Place', 'Date'];

interface ParsedRow {
  rowNumber: number;
  personNameRaw: string;
  typeRaw: string;
  amountRaw: string;
  paymentModeRaw: string;
  place: string;
  dateRaw: string;
  personName?: string;
  transactionType?: TransactionType;
  amount?: number;
  paymentMode?: PaymentMode;
  transactionDate?: string;
  errors: string[];
  importStatus?: 'success' | 'failed';
  importError?: string;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Parses a Date column cell into an ISO (YYYY-MM-DD) string. Accepts a native
 * Excel date cell (read as a JS Date via `cellDates: true`), an ISO string,
 * or a common D/M/Y or D-M-Y text date. Returns undefined (with the original
 * text preserved for the preview) when the cell is blank or unparseable.
 */
function parseDateCell(raw: unknown): { iso: string | undefined; display: string } {
  if (raw === null || raw === undefined || raw === '') return { iso: undefined, display: '' };

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    // Depending on how the workbook was written, the date-only value can land on
    // UTC midnight or on local midnight (with a small drift). Nudge by 30 minutes,
    // then read whichever convention puts the value at the start of a day.
    const shifted = new Date(raw.getTime() + 30 * 60 * 1000);
    const utcBased = shifted.getUTCHours() === 0;
    const y = utcBased ? shifted.getUTCFullYear() : shifted.getFullYear();
    const mo = (utcBased ? shifted.getUTCMonth() : shifted.getMonth()) + 1;
    const d = utcBased ? shifted.getUTCDate() : shifted.getDate();
    const iso = `${y}-${pad2(mo)}-${pad2(d)}`;
    return { iso, display: iso };
  }

  const str = String(raw).trim();
  if (!str) return { iso: undefined, display: '' };

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return { iso: `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`, display: str };
  }

  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yr = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { iso: `${yr}-${pad2(month)}-${pad2(day)}`, display: str };
    }
  }

  return { iso: undefined, display: str };
}

function normalizePaymentMode(raw: string): PaymentMode | undefined {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (VALID_PAYMENT_MODES as string[]).includes(cleaned) ? (cleaned as PaymentMode) : undefined;
}

function normalizeType(raw: string): TransactionType | undefined {
  const cleaned = raw.trim().toUpperCase();
  return (VALID_TYPES as string[]).includes(cleaned) ? (cleaned as TransactionType) : undefined;
}

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[,₹\s]/g, '');
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Validates one parsed row against the current field rules. Mirrors the manual Add Transaction form's own validation rules. */
function validateRow(row: ParsedRow): ParsedRow {
  const errors: string[] = [];

  if (!row.personNameRaw) {
    errors.push('Person Name is required');
  } else {
    row.personName = row.personNameRaw.trim();
  }

  if (!row.typeRaw) {
    errors.push('Type is required');
  } else {
    const type = normalizeType(row.typeRaw);
    if (!type) errors.push('Type must be "Given" or "Received"');
    else row.transactionType = type;
  }

  if (!row.amountRaw) {
    errors.push('Amount is required');
  } else {
    const amount = parseAmount(row.amountRaw);
    if (amount === undefined) errors.push('Amount must be a number greater than zero');
    else row.amount = amount;
  }

  if (!row.paymentModeRaw) {
    errors.push('Payment Mode is required');
  } else {
    const mode = normalizePaymentMode(row.paymentModeRaw);
    if (!mode) errors.push('Payment Mode must be Cash, UPI, Bank Transfer, or Other');
    else row.paymentMode = mode;
  }

  // Date is optional per row — a blank cell falls back to today's date at
  // import time (same behavior as before the Date column existed). A cell
  // that has content but doesn't parse is a validation error.
  if (row.dateRaw && !row.transactionDate) {
    errors.push('Date must be YYYY-MM-DD, D/M/Y, or a date-formatted Excel cell');
  }

  row.errors = errors;
  return row;
}

export function ExcelImportModal({ onClose, onImported }: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [stage, setStage] = useState<'choose' | 'preview' | 'importing' | 'done'>('choose');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { notify } = useToast();

  const handleFile = async (file: File) => {
    setFileError(null);
    setFileName(file.name);
    try {
      // Loaded on demand: the spreadsheet library is large and only needed here.
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setFileError('The Excel file does not contain any sheets.');
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (records.length === 0) {
        setFileError('No data rows were found in the Excel file.');
        return;
      }

      // Map whatever headers are present to the expected columns, tolerating case/spacing differences.
      const sampleKeys = Object.keys(records[0]);
      const headerMap: Record<string, string> = {};
      sampleKeys.forEach((key) => { headerMap[normalizeHeader(key)] = key; });

      const personNameCol = headerMap['personname'];
      const typeCol = headerMap['type'];
      const amountCol = headerMap['amount'];
      const paymentModeCol = headerMap['paymentmode'];
      const placeCol = headerMap['place'];
      const dateCol = headerMap['date'];

      if (!personNameCol || !typeCol || !amountCol || !paymentModeCol) {
        setFileError(
          `The file is missing one or more expected columns. Expected columns: ${EXPECTED_COLUMNS.join(', ')}.`
        );
        return;
      }

      const parsed: ParsedRow[] = records
        .map((record, index) => {
          const parsedDate = parseDateCell(dateCol ? record[dateCol] : '');
          const row: ParsedRow = {
            rowNumber: index + 2, // account for the header row
            personNameRaw: cellToString(record[personNameCol]),
            typeRaw: cellToString(record[typeCol]),
            amountRaw: cellToString(record[amountCol]),
            paymentModeRaw: cellToString(record[paymentModeCol]),
            place: placeCol ? cellToString(record[placeCol]) : '',
            dateRaw: parsedDate.display,
            transactionDate: parsedDate.iso,
            errors: [],
          };
          return row;
        })
        // Skip fully blank trailing rows.
        .filter((row) => row.personNameRaw || row.typeRaw || row.amountRaw || row.paymentModeRaw || row.place || row.dateRaw);

      if (parsed.length === 0) {
        setFileError('No data rows were found in the Excel file.');
        return;
      }

      setRows(parsed.map((row) => validateRow(row)));
      setStage('preview');
    } catch {
      setFileError('Could not read this file. Please upload a valid .xlsx or .xls file.');
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const runImport = async () => {
    setStage('importing');
    const today = todayIso();
    const updated = rows.map((r) => ({ ...r }));
    const importable = updated.filter((r) => r.errors.length === 0);

    const inputs: MoyTransactionInput[] = importable.map((row) => ({
      personName: row.personName!,
      transactionType: row.transactionType!,
      amount: row.amount!,
      paymentMode: row.paymentMode!,
      transactionDate: row.transactionDate ?? today,
      place: row.place || undefined,
    }));

    // Same validation and save path as the manual Add Transaction form, in one write.
    const results = await createMoyTransactionsBulk(inputs);
    importable.forEach((row, i) => {
      row.importStatus = results[i].ok ? 'success' : 'failed';
      row.importError = results[i].error ?? 'Save failed';
    });

    setRows(updated);
    setStage('done');
    const successCount = updated.filter((r) => r.importStatus === 'success').length;
    if (successCount > 0) {
      notify(`Imported ${successCount} of ${validRows.length} transaction(s)`, successCount === validRows.length ? 'success' : 'error');
      onImported();
    } else {
      notify('No transactions were imported', 'error');
    }
  };

  return (
    <div className="import-modal">
      <Modal title="Import Transactions from Excel" onClose={onClose}>
        {stage === 'choose' && (
          <div>
            <p className="muted">
              Upload an Excel file with columns: <strong>{EXPECTED_COLUMNS.join(', ')}</strong>.
              Date accepts YYYY-MM-DD, D/M/Y, or an Excel date cell. If a row&rsquo;s Date is left
              blank, it defaults to today&rsquo;s date ({todayIso()}).
            </p>
            <div className="import-dropzone">
              <div>Select an Excel file (.xlsx or .xls) to import</div>
              <input type="file" accept=".xlsx,.xls" onChange={onFileInputChange} />
            </div>
            {fileError && <div className="form-error">{fileError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {(stage === 'preview' || stage === 'importing' || stage === 'done') && (
          <div>
            <p className="muted">File: {fileName}</p>
            <div className="import-summary">
              <span>Total rows: {rows.length}</span>
              <span className="value-positive">Valid: {validRows.length}</span>
              {invalidRows.length > 0 && <span className="value-negative">Invalid: {invalidRows.length}</span>}
            </div>

            <div className="import-preview-table-wrap">
              <table className="import-preview-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Person Name</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Place</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className={row.errors.length > 0 ? 'import-row-invalid' : ''}>
                      <td>{row.rowNumber}</td>
                      <td>{row.personNameRaw || '—'}</td>
                      <td>{row.typeRaw || '—'}</td>
                      <td>{row.amountRaw || '—'}</td>
                      <td>{row.paymentModeRaw || '—'}</td>
                      <td>{row.place || '—'}</td>
                      <td>{row.dateRaw || 'Today (default)'}</td>
                      <td>
                        {row.importStatus === 'success' && <span className="import-row-status ok">Imported</span>}
                        {row.importStatus === 'failed' && <span className="import-row-status error">{row.importError}</span>}
                        {!row.importStatus && row.errors.length === 0 && <span className="import-row-status ok">Ready</span>}
                        {!row.importStatus && row.errors.length > 0 && (
                          <span className="import-row-errors">{row.errors.join('; ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              {stage === 'preview' && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={validRows.length === 0}
                    onClick={runImport}
                  >
                    Import {validRows.length} Valid Transaction{validRows.length === 1 ? '' : 's'}
                  </button>
                </>
              )}
              {stage === 'importing' && <button type="button" className="btn btn-primary" disabled>Importing...</button>}
              {stage === 'done' && <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
