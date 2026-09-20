import type { MoyTransactionInput } from '../types/domain';

/** Raised when input breaks a business rule; the message is safe to show to the user. */
export class ValidationError extends Error {}

const TYPES = ['GIVEN', 'RECEIVED'];
const MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];
const MAX_AMOUNT = 9_999_999_999.99; // matches the original DECIMAL(12,2) column

export function isValidIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Same rules the Spring `MoyTransactionRequest` enforced. Returns a cleaned copy. */
export function validateTransactionInput(input: MoyTransactionInput): MoyTransactionInput {
  const personName = (input.personName ?? '').trim();
  if (!personName) throw new ValidationError('Person name is required');
  if (personName.length > 150) throw new ValidationError('Person name must be at most 150 characters');

  if (!TYPES.includes(input.transactionType)) throw new ValidationError('Transaction type is required');

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount)) {
    throw new ValidationError('Amount is required');
  }
  if (input.amount < 0.01) throw new ValidationError('Amount must be greater than zero');
  if (input.amount > MAX_AMOUNT) throw new ValidationError('Amount is too large');

  if (!MODES.includes(input.paymentMode)) throw new ValidationError('Payment mode is required');

  if (!input.transactionDate || !isValidIsoDate(input.transactionDate)) {
    throw new ValidationError('Transaction date is required (YYYY-MM-DD)');
  }

  const place = (input.place ?? '').trim();
  if (place.length > 200) throw new ValidationError('Place must be at most 200 characters');

  const notes = (input.notes ?? '').trim();
  if (notes.length > 1000) throw new ValidationError('Notes must be at most 1000 characters');

  return {
    personName,
    transactionType: input.transactionType,
    amount: Math.round(input.amount * 100) / 100,
    paymentMode: input.paymentMode,
    transactionDate: input.transactionDate,
    place: place || undefined,
    notes: notes || undefined,
  };
}
