import type { ExportFormat, MonthlyReportRow, PersonReportRow, YearlyReportRow } from '../types/domain';
import * as reports from '../local-backend/reports';
import { exportPersonReport } from '../local-backend/exports';

export type { MonthlyReportRow, PersonReportRow, YearlyReportRow };

export async function getPersonReport(): Promise<PersonReportRow[]> {
  return reports.getPersonReport();
}

export async function getYearlyReport(): Promise<YearlyReportRow[]> {
  return reports.getYearlyReport();
}

export async function getMonthlyReport(year: number): Promise<MonthlyReportRow[]> {
  return reports.getMonthlyReport(year);
}

export function downloadPersonReport(format: ExportFormat): Promise<void> {
  // Runs synchronously up to the export call so a PDF window can open from the click.
  return exportPersonReport(format, reports.getPersonReport());
}
