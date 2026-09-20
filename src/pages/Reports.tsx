import React, { useEffect, useState } from 'react';
import { downloadPersonReport, getMonthlyReport, getPersonReport, getYearlyReport, type MonthlyReportRow, type PersonReportRow, type YearlyReportRow } from '../api/reportApi';
import { DataTable } from '../components/DataTable';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { YearDropdown } from '../components/YearDropdown';
import { useYearFilter } from '../context/YearFilterContext';
import { useToast } from '../components/Toast';
import { MONTH_NAMES } from '../utils/format';

type ReportTab = 'person' | 'yearly' | 'monthly';

export function Reports() {
  const [tab, setTab] = useState<ReportTab>('person');
  const [personRows, setPersonRows] = useState<PersonReportRow[]>([]);
  const [yearlyRows, setYearlyRows] = useState<YearlyReportRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportRow[]>([]);
  const { year, setYear } = useYearFilter();
  const { notify } = useToast();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (tab === 'person') getPersonReport().then(setPersonRows).catch(() => notify('Failed to load report', 'error'));
    if (tab === 'yearly') getYearlyReport().then(setYearlyRows).catch(() => notify('Failed to load report', 'error'));
    if (tab === 'monthly') getMonthlyReport(year).then(setMonthlyRows).catch(() => notify('Failed to load report', 'error'));
  }, [tab, year]);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(true);
    try {
      await downloadPersonReport(format);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Reports</h2>
        <div className="export-buttons">
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExport('csv')}>Export CSV</button>
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExport('xlsx')}>Export Excel</button>
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExport('pdf')}>Export PDF</button>
        </div>
      </div>

      <div className="tabs">
        {(['person', 'yearly', 'monthly'] as ReportTab[]).map((t) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} Report
          </button>
        ))}
      </div>

      {tab === 'monthly' && <YearDropdown year={year} onChange={setYear} />}

      {tab === 'person' && (
        <DataTable<PersonReportRow>
          columns={[
            { header: 'Person', render: (r) => r.personName },
            { header: 'Given', render: (r) => <CurrencyDisplay amount={r.given} />, align: 'right' },
            { header: 'Received', render: (r) => <CurrencyDisplay amount={r.received} />, align: 'right' },
            { header: 'Difference', render: (r) => <CurrencyDisplay amount={r.difference} />, align: 'right' },
          ]}
          rows={personRows}
        />
      )}

      {tab === 'yearly' && (
        <DataTable<YearlyReportRow>
          columns={[
            { header: 'Year', render: (r) => r.year },
            { header: 'Given', render: (r) => <CurrencyDisplay amount={r.given} />, align: 'right' },
            { header: 'Received', render: (r) => <CurrencyDisplay amount={r.received} />, align: 'right' },
            { header: 'Difference', render: (r) => <CurrencyDisplay amount={r.difference} />, align: 'right' },
          ]}
          rows={yearlyRows}
        />
      )}

      {tab === 'monthly' && (
        <DataTable<MonthlyReportRow>
          columns={[
            { header: 'Month', render: (r) => MONTH_NAMES[r.month - 1] ?? r.month },
            { header: 'Given', render: (r) => <CurrencyDisplay amount={r.given} />, align: 'right' },
            { header: 'Received', render: (r) => <CurrencyDisplay amount={r.received} />, align: 'right' },
          ]}
          rows={monthlyRows}
        />
      )}

    </div>
  );
}
