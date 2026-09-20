import type {
  DashboardData, MonthlyReportRow, PersonReportRow, TransactionType, YearlyReportRow,
} from '../types/domain';
import { fromPaise, toPaise } from './money';
import type { StoredTransaction } from './storage';
import { listActive } from './transactions';

const TOP_N = 10;

const yearOf = (t: StoredTransaction) => Number(t.transactionDate.slice(0, 4));
const monthOf = (t: StoredTransaction) => Number(t.transactionDate.slice(5, 7));

function sumBy<K>(rows: StoredTransaction[], key: (t: StoredTransaction) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const t of rows) map.set(key(t), (map.get(key(t)) ?? 0) + toPaise(t.amount));
  return map;
}

function totalOf(rows: StoredTransaction[]): number {
  return fromPaise(rows.reduce((s, t) => s + toPaise(t.amount), 0));
}

function monthlyAmounts(rows: StoredTransaction[]): { month: number; amount: number }[] {
  return Array.from(sumBy(rows, monthOf).entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, paise]) => ({ month, amount: fromPaise(paise) }));
}

function yearlyAmounts(rows: StoredTransaction[]): { year: number; amount: number }[] {
  return Array.from(sumBy(rows, yearOf).entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, paise]) => ({ year, amount: fromPaise(paise) }));
}

function topPeople(rows: StoredTransaction[]): { personName: string; amount: number }[] {
  return Array.from(sumBy(rows, (t) => t.personName).entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_N)
    .map(([personName, paise]) => ({ personName, amount: fromPaise(paise) }));
}

/** Dashboard for one year, or across every year when `allYears` is true. */
export function getDashboard(year: number, allYears: boolean): DashboardData {
  const all = listActive();
  const scoped = allYears ? all : all.filter((t) => yearOf(t) === year);
  const ofType = (rows: StoredTransaction[], type: TransactionType) => rows.filter((t) => t.transactionType === type);

  const given = ofType(scoped, 'GIVEN');
  const received = ofType(scoped, 'RECEIVED');

  return {
    year: allYears ? new Date().getFullYear() : year,
    allYears,
    totalGiven: totalOf(given),
    totalReceived: totalOf(received),
    // Like the original, the people count covers every year regardless of the filter.
    numberOfPeople: new Set(all.map((t) => t.personName)).size,
    numberOfGivenTransactions: given.length,
    numberOfReceivedTransactions: received.length,
    monthlyGiven: monthlyAmounts(given),
    monthlyReceived: monthlyAmounts(received),
    yearWiseGiven: yearlyAmounts(ofType(all, 'GIVEN')),
    yearWiseReceived: yearlyAmounts(ofType(all, 'RECEIVED')),
    topGivenPeople: topPeople(given),
    topReceivedPeople: topPeople(received),
  };
}

export function getPersonReport(): PersonReportRow[] {
  const rows = listActive();
  const given = sumBy(rows.filter((t) => t.transactionType === 'GIVEN'), (t) => t.personName);
  const received = sumBy(rows.filter((t) => t.transactionType === 'RECEIVED'), (t) => t.personName);
  const names = new Set<string>([...given.keys(), ...received.keys()]);
  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((personName) => {
      const g = given.get(personName) ?? 0;
      const r = received.get(personName) ?? 0;
      return { personName, given: fromPaise(g), received: fromPaise(r), difference: fromPaise(Math.abs(g - r)) };
    });
}

export function getYearlyReport(): YearlyReportRow[] {
  const rows = listActive();
  const given = sumBy(rows.filter((t) => t.transactionType === 'GIVEN'), yearOf);
  const received = sumBy(rows.filter((t) => t.transactionType === 'RECEIVED'), yearOf);
  const years = Array.from(new Set<number>([...given.keys(), ...received.keys()])).sort((a, b) => a - b);
  return years.map((year) => {
    const g = given.get(year) ?? 0;
    const r = received.get(year) ?? 0;
    return { year, given: fromPaise(g), received: fromPaise(r), difference: fromPaise(Math.abs(g - r)) };
  });
}

export function getMonthlyReport(year: number): MonthlyReportRow[] {
  const rows = listActive().filter((t) => yearOf(t) === year);
  const given = sumBy(rows.filter((t) => t.transactionType === 'GIVEN'), monthOf);
  const received = sumBy(rows.filter((t) => t.transactionType === 'RECEIVED'), monthOf);
  const months = Array.from(new Set<number>([...given.keys(), ...received.keys()])).sort((a, b) => a - b);
  return months.map((month) => ({
    year,
    month,
    given: fromPaise(given.get(month) ?? 0),
    received: fromPaise(received.get(month) ?? 0),
  }));
}
