/**
 * Money is summed in integer paise so totals never pick up floating-point
 * drift (the original backend used BigDecimal for the same reason).
 */
export const toPaise = (amount: number): number => Math.round(amount * 100);
export const fromPaise = (paise: number): number => paise / 100;

export function sumAmounts(values: number[]): number {
  let total = 0;
  for (const v of values) total += toPaise(v);
  return fromPaise(total);
}
