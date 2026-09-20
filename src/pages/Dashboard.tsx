import React, { useEffect, useRef, useState } from 'react';
import { useYearFilter } from '../context/YearFilterContext';
import { getDashboard } from '../api/dashboardApi';
import type { DashboardData } from '../types/domain';
import { YearDropdown } from '../components/YearDropdown';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { MonthlyBarChart, TopPeopleChart } from '../components/ChartCard';
import { useToast } from '../components/Toast';

export function Dashboard() {
  const { year, setYear } = useYearFilter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Local to the Dashboard only — unchecked by default, and doesn't affect
  // the shared year filter used elsewhere (e.g. Reports).
  const [showAllYears, setShowAllYears] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard(year, showAllYears)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => notify('Failed to load dashboard', 'error'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, showAllYears]);

  // Years actually present in the records — yearWiseGiven/yearWiseReceived
  // cover all-time data regardless of the selected year, so this list is
  // never hardcoded and always reflects what currently exists.
  const availableYears = data
    ? Array.from(new Set([...data.yearWiseGiven.map((y) => y.year), ...data.yearWiseReceived.map((y) => y.year)]))
    : [];

  // If the current calendar year isn't among the available years, fall back
  // to the most recent year that actually has records instead of leaving the
  // dropdown pointed at a year with no data. Runs once, so it never
  // overrides a year the user picks afterwards.
  const didInitDefaultYear = useRef(false);
  useEffect(() => {
    if (!data || didInitDefaultYear.current) return;
    didInitDefaultYear.current = true;
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      const mostRecent = Math.max(...availableYears);
      setYear(mostRecent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="header-actions">
          <span className={showAllYears ? 'year-dropdown-disabled' : undefined}>
            <YearDropdown year={year} onChange={setYear} years={availableYears} />
          </span>
          <label className="show-all-years-toggle">
            <input
              type="checkbox"
              checked={showAllYears}
              onChange={(e) => setShowAllYears(e.target.checked)}
            />
            Show All Years
          </label>
        </div>
      </div>

      {loading && <div className="loading">Loading dashboard...</div>}

      {data && (
        <>
          <div className="summary-cards">
            <SummaryCard label="Total Moy Given" value={<CurrencyDisplay amount={data.totalGiven} />} />
            <SummaryCard label="Total Moy Received" value={<CurrencyDisplay amount={data.totalReceived} />} />
            <SummaryCard label="Net Diff" value={<NetDiff totalReceived={data.totalReceived} totalGiven={data.totalGiven} />} />
            <SummaryCard label="People" value={data.numberOfPeople} />
            <SummaryCard label="Given Transactions" value={data.numberOfGivenTransactions} />
            <SummaryCard label="Received Transactions" value={data.numberOfReceivedTransactions} />
          </div>

          <div className="charts-grid">
            <MonthlyBarChart given={data.monthlyGiven} received={data.monthlyReceived} />
            <TopPeopleChart title="Top People by Amount Given" people={data.topGivenPeople} />
            <TopPeopleChart title="Top People by Amount Received" people={data.topReceivedPeople} />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

/**
 * Net Diff = Total Moy Given - Total Moy Received.
 * Purely derived from the existing Dashboard totals for the selected year —
 * does not alter how totalGiven/totalReceived are calculated or fetched.
 * Green when positive, red when negative, default text color when exactly zero.
 */
function NetDiff({ totalReceived, totalGiven }: { totalReceived: number; totalGiven: number }) {
  const netDiff = totalGiven - totalReceived;
  const colorClass = netDiff > 0 ? 'value-positive' : netDiff < 0 ? 'value-negative' : '';
  return <CurrencyDisplay amount={netDiff} className={colorClass} />;
}
