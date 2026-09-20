export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type TransactionType = 'GIVEN' | 'RECEIVED';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface MoyTransaction {
  transactionId: number;
  personName: string;
  transactionType: TransactionType;
  amount: number;
  paymentMode: PaymentMode;
  transactionDate: string; // YYYY-MM-DD
  place?: string;
  notes?: string;
}

export type MoyTransactionInput = Omit<MoyTransaction, 'transactionId'>;

export interface MoyFilter {
  personName?: string;
  transactionType?: TransactionType;
  paymentMode?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  place?: string;
  page?: number;
  size?: number;
}

export interface PersonRelationshipSummary {
  personName: string;
  totalGiven: number;
  totalReceived: number;
  difference: number;
  status: 'GIVEN_MORE' | 'RECEIVED_MORE' | 'BALANCED' | 'NO_TRANSACTIONS';
  lastTransactionDate?: string;
  reciprocalTransactionsObserved: boolean;
}

export interface DashboardData {
  year: number;
  allYears: boolean;
  totalGiven: number;
  totalReceived: number;
  numberOfPeople: number;
  numberOfGivenTransactions: number;
  numberOfReceivedTransactions: number;
  monthlyGiven: { month: number; amount: number }[];
  monthlyReceived: { month: number; amount: number }[];
  yearWiseGiven: { year: number; amount: number }[];
  yearWiseReceived: { year: number; amount: number }[];
  topGivenPeople: { personName: string; amount: number }[];
  topReceivedPeople: { personName: string; amount: number }[];
}

export interface PersonReportRow {
  personName: string;
  given: number;
  received: number;
  difference: number;
}

export interface YearlyReportRow {
  year: number;
  given: number;
  received: number;
  difference: number;
}

export interface MonthlyReportRow {
  year: number;
  month: number;
  given: number;
  received: number;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
