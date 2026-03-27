import type { Entry } from './types';

/**
 * Computes Available Balance = Total Income − (Total Expenses + Total Savings).
 * Uses `convertedAmount` when present (multi-currency entries), otherwise `amount`.
 * Excludes soft-deleted entries.
 */
export function computeAvailableBalance(entries: Entry[]): number {
  let income = 0;
  let expenses = 0;
  let savings = 0;

  for (const entry of entries) {
    if (entry.isDeleted) continue;
    const value = entry.convertedAmount ?? entry.amount;
    if (entry.entryType === 'income') income += value;
    else if (entry.entryType === 'expense') expenses += value;
    else if (entry.entryType === 'savings') savings += value;
  }

  return income - (expenses + savings);
}
