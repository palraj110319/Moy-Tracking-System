import React from 'react';

/**
 * `years`, when provided, is used as the exact option list (e.g. the Dashboard
 * passes the years actually present in the current records, so nothing is
 * hardcoded or added artificially). When omitted — as with existing callers
 * that haven't opted in — the original static range (currentYear+1 down to
 * fromYear) is used unchanged, so their behavior is not affected.
 */
export function YearDropdown({
  year,
  onChange,
  fromYear = 2020,
  years,
}: {
  year: number;
  onChange: (y: number) => void;
  fromYear?: number;
  years?: number[];
}) {
  let options: number[];
  if (years && years.length > 0) {
    options = [...years].sort((a, b) => b - a);
  } else {
    const currentYear = new Date().getFullYear();
    options = [];
    for (let y = currentYear + 1; y >= fromYear; y--) options.push(y);
  }

  return (
    <select className="year-dropdown" value={year} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}
