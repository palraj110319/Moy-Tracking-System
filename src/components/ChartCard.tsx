import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { formatInr, formatInrCompact } from '../utils/format';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ChartCard({ title, height = 260, children }: { title: string; height?: number; children: React.ReactNode }) {
  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBarChart({ given, received }: {
  given: { month: number; amount: number }[]; received: { month: number; amount: number }[];
}) {
  const data = MONTH_LABELS.map((label, idx) => ({
    month: label,
    Given: given.find((g) => g.month === idx + 1)?.amount ?? 0,
    Received: received.find((r) => r.month === idx + 1)?.amount ?? 0,
  }));

  return (
    <ChartCard title="Monthly Moy Given vs Received">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => formatInrCompact(v)} width={60} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => formatInr(v)} />
        <Legend />
        <Bar dataKey="Given" fill="#d9822b" />
        <Bar dataKey="Received" fill="#2b7cd9" />
      </BarChart>
    </ChartCard>
  );
}

export function TopPeopleChart({ title, people }: { title: string; people: { personName: string; amount: number }[] }) {
  if (people.length === 0) {
    return (
      <div className="card chart-card">
        <h3>{title}</h3>
        <div className="empty-state">No data for this period</div>
      </div>
    );
  }
  return (
    <ChartCard title={title} height={Math.max(220, people.length * 30 + 50)}>
      <BarChart data={people} layout="vertical" margin={{ left: 8, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => formatInrCompact(v)} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="personName" width={120} tick={{ fontSize: 12 }} interval={0} />
        <Tooltip formatter={(v: number) => formatInr(v)} />
        <Bar dataKey="amount" fill="#2f9e44" />
      </BarChart>
    </ChartCard>
  );
}
