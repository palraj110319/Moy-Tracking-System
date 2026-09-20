import React from 'react';
import { formatInr } from '../utils/format';

export { formatInr };

export function CurrencyDisplay({ amount, className }: { amount: number; className?: string }) {
  return <span className={className}>{formatInr(amount)}</span>;
}
