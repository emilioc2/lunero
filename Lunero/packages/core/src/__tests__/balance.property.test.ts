import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { computeAvailableBalance } from '../balance';
import type { Entry } from '../types';

// Arbitrary for a single non-deleted entry
const entryArb = fc.record<Entry>({
  id: fc.uuid(),
  flowSheetId: fc.uuid(),
  userId: fc.uuid(),
  entryType: fc.constantFrom('income', 'expense', 'savings'),
  categoryId: fc.uuid(),
  amount: fc.float({ min: Math.fround(0.01), max: 1_000_000, noNaN: true }),
  currency: fc.constantFrom('USD', 'EUR', 'GBP'),
  convertedAmount: fc.option(fc.float({ min: Math.fround(0.01), max: 1_000_000, noNaN: true }), { nil: undefined }),
  conversionRate: fc.option(fc.float({ min: Math.fround(0.01), max: 100, noNaN: true }), { nil: undefined }),
  entryDate: fc.constant('2024-01-15'),
  note: fc.option(fc.string(), { nil: undefined }),
  isDeleted: fc.boolean(),
  clientUpdatedAt: fc.option(fc.constant('2024-01-15T00:00:00Z'), { nil: undefined }),
  createdAt: fc.constant('2024-01-01T00:00:00Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00Z'),
});

/**
 * Property 1: Available Balance Invariant
 *
 * For any set of entries, availableBalance must always equal:
 *   totalIncome − (totalExpenses + totalSavings)
 * where each value uses convertedAmount when present, otherwise amount,
 * and soft-deleted entries are excluded.
 */
describe('Property 1: Available Balance Invariant', () => {
  it('balance always equals income − (expenses + savings)', () => {
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 50 }), (entries) => {
        const result = computeAvailableBalance(entries);

        // Manually compute expected value
        let income = 0, expenses = 0, savings = 0;
        for (const e of entries) {
          if (e.isDeleted) continue;
          const value = e.convertedAmount ?? e.amount;
          if (e.entryType === 'income') income += value;
          else if (e.entryType === 'expense') expenses += value;
          else if (e.entryType === 'savings') savings += value;
        }
        const expected = income - (expenses + savings);

        // Allow floating-point epsilon
        return Math.abs(result - expected) < 0.0001;
      }),
      { numRuns: 500 }
    );
  });

  it('adding a deleted entry never changes the balance', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { maxLength: 20 }),
        entryArb,
        (entries, extra) => {
          const baseline = computeAvailableBalance(entries);
          const withDeleted = computeAvailableBalance([
            ...entries,
            { ...extra, isDeleted: true },
          ]);
          return Math.abs(baseline - withDeleted) < 0.0001;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('balance is monotonically affected by entry type', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { maxLength: 20 }),
        fc.float({ min: Math.fround(0.01), max: 10000, noNaN: true }),
        (entries, amount) => {
          const baseline = computeAvailableBalance(entries);

          const incomeEntry: Entry = {
            id: 'test-income',
            flowSheetId: 'fs1', userId: 'u1', categoryId: 'cat1',
            entryType: 'income', amount, currency: 'USD',
            entryDate: '2024-01-15', isDeleted: false,
            createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
          };
          const withIncome = computeAvailableBalance([...entries, incomeEntry]);

          const expenseEntry: Entry = { ...incomeEntry, id: 'test-expense', entryType: 'expense' };
          const withExpense = computeAvailableBalance([...entries, expenseEntry]);

          // Adding income increases balance; adding expense decreases it
          return (
            Math.abs(withIncome - (baseline + amount)) < 0.0001 &&
            Math.abs(withExpense - (baseline - amount)) < 0.0001
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});
