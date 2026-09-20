import React from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export function DataTable<T>({ columns, rows, emptyMessage = 'No data yet' }: {
  columns: Column<T>[]; rows: T[]; emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => <th key={i} style={{ textAlign: c.align ?? 'left' }}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((c, ci) => <td key={ci} style={{ textAlign: c.align ?? 'left' }}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
