import type { ExportFormat, MoyTransaction, PersonReportRow } from '../types/domain';
import { formatInr, todayIso } from '../utils/format';
import { downloadBlob } from './download';

/** The xlsx library is large, so it is only loaded when an Excel action is used. */
async function loadXlsx() {
  return import('xlsx');
}

const TRANSACTION_HEADERS = ['Person Name', 'Type', 'Amount', 'Payment Mode', 'Place', 'Date'];

/**
 * Columns match what Import Excel accepts, so an exported file can be
 * re-imported unchanged.
 */
export async function exportTransactionsToExcel(rows: MoyTransaction[]): Promise<void> {
  const XLSX = await loadXlsx();
  const sheetRows = rows.map((t) => ({
    'Person Name': t.personName,
    Type: t.transactionType,
    Amount: t.amount,
    'Payment Mode': t.paymentMode,
    Place: t.place ?? '',
    Date: t.transactionDate,
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: TRANSACTION_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Moy Transactions');
  XLSX.writeFile(workbook, `moy-transactions-${todayIso()}.xlsx`);
}

const REPORT_HEADERS = ['Person', 'Given', 'Received', 'Difference'];

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Opens a print-ready page; the browser's "Save as PDF" produces the PDF. */
function openPrintableReport(rows: PersonReportRow[]): void {
  const win = window.open('', '_blank');
  if (!win) throw new Error('Pop-ups are blocked. Allow pop-ups for this site to export a PDF.');

  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.personName)}</td><td class="n">${formatInr(r.given)}</td>` +
        `<td class="n">${formatInr(r.received)}</td><td class="n">${formatInr(r.difference)}</td></tr>`
    )
    .join('');

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Person Moy Summary Report</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
  h1{font-size:18px;margin:0 0 4px} p{margin:0 0 16px;color:#555;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
  th{background:#f3f4f6} .n{text-align:right}
  thead{display:table-header-group} tr{page-break-inside:avoid}
</style></head><body>
<h1>Person Moy Summary Report</h1><p>Generated ${todayIso()}</p>
<table><thead><tr><th>Person</th><th class="n">Given</th><th class="n">Received</th><th class="n">Difference</th></tr></thead>
<tbody>${body}</tbody></table>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script>
</body></html>`);
  win.document.close();
}

export async function exportPersonReport(format: ExportFormat, rows: PersonReportRow[]): Promise<void> {
  // PDF must open its window synchronously (before any await) or popup blockers stop it.
  if (format === 'pdf') {
    openPrintableReport(rows);
    return;
  }

  if (format === 'csv') {
    const lines = [REPORT_HEADERS.join(',')];
    for (const r of rows) lines.push([csvEscape(r.personName), r.given, r.received, r.difference].join(','));
    // BOM so Excel reads non-Latin names (e.g. Tamil) correctly.
    downloadBlob(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), 'person-report.csv');
    return;
  }

  const XLSX = await loadXlsx();
  const sheetRows = rows.map((r) => ({
    Person: r.personName,
    Given: r.given,
    Received: r.received,
    Difference: r.difference,
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: REPORT_HEADERS });
  worksheet['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Person Report');
  XLSX.writeFile(workbook, 'person-report.xlsx');
}
