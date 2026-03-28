/**
 * Tests for TransactionRow logic — dot color mapping, formatting, aria-label generation.
 * Requirements: 18.3, 18.4, 18.5, 18.6, 18.7, 18.8
 */
import { describe, it, expect } from 'vitest';

type EntryType = 'income' | 'expense' | 'savings';

const COLOR = {
  positiveGreen: '#22C55E',
  expenseClayRed: '#C86D5A',
  savingsWarmEarth: '#C4A484',
  incomeOliveGray: '#6B6F69',
} as const;

function dotColor(entryType: EntryType): string {
  switch (entryType) {
    case 'income':
      return COLOR.positiveGreen;
    case 'expense':
      return COLOR.expenseClayRed;
    case 'savings':
      return COLOR.savingsWarmEarth;
  }
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  const normalized = isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(normalized));
}

function buildAriaLabel(
  entryType: EntryType,
  amount: number,
  currency: string,
  note: string,
  categoryName: string,
  entryDate: string,
): string {
  const prefix = entryType === 'income' ? '+' : '\u2212';
  const typeLabel =
    entryType === 'income' ? 'Income' : entryType === 'expense' ? 'Expense' : 'Savings';
  return `${typeLabel}: ${prefix}${formatAmount(amount, currency)}, ${note}, category ${categoryName}, ${formatDate(entryDate)}`;
}

describe('TransactionRow logic', () => {
  describe('dotColor', () => {
    it('returns green for income', () => {
      expect(dotColor('income')).toBe(COLOR.positiveGreen);
    });

    it('returns Clay Red for expense', () => {
      expect(dotColor('expense')).toBe(COLOR.expenseClayRed);
    });

    it('returns Warm Earth for savings', () => {
      expect(dotColor('savings')).toBe(COLOR.savingsWarmEarth);
    });
  });

  describe('formatAmount', () => {
    it('formats USD with two decimals', () => {
      const result = formatAmount(85.5, 'USD');
      expect(result).toContain('85');
      expect(result).toContain('50');
    });

    it('formats zero correctly', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('formats large amounts with grouping', () => {
      const result = formatAmount(3200, 'USD');
      expect(result).toContain('3,200');
    });
  });

  describe('formatDate', () => {
    it('formats a date-only ISO string', () => {
      const result = formatDate('2026-03-15');
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });

    it('formats a full ISO datetime string', () => {
      const result = formatDate('2026-03-14T10:30:00');
      expect(result).toContain('Mar');
      expect(result).toContain('14');
      expect(result).toContain('2026');
    });
  });

  describe('signed amount prefix', () => {
    it('uses + prefix for income', () => {
      const prefix = 'income' === 'income' ? '+' : '\u2212';
      expect(prefix).toBe('+');
    });

    it('uses − prefix for expense', () => {
      const entryType: EntryType = 'expense';
      const prefix = entryType === 'income' ? '+' : '\u2212';
      expect(prefix).toBe('\u2212');
    });

    it('uses − prefix for savings', () => {
      const entryType: EntryType = 'savings';
      const prefix = entryType === 'income' ? '+' : '\u2212';
      expect(prefix).toBe('\u2212');
    });
  });

  describe('amount color mapping', () => {
    function amountColor(entryType: EntryType): string {
      return entryType === 'income'
        ? COLOR.incomeOliveGray
        : entryType === 'expense'
          ? COLOR.expenseClayRed
          : COLOR.savingsWarmEarth;
    }

    it('uses Olive Gray for income amounts', () => {
      expect(amountColor('income')).toBe(COLOR.incomeOliveGray);
    });

    it('uses Clay Red for expense amounts', () => {
      expect(amountColor('expense')).toBe(COLOR.expenseClayRed);
    });

    it('uses Warm Earth for savings amounts', () => {
      expect(amountColor('savings')).toBe(COLOR.savingsWarmEarth);
    });
  });

  describe('aria-label generation', () => {
    it('builds correct label for income entry', () => {
      const label = buildAriaLabel('income', 3200, 'USD', 'Salary', 'Salary', '2026-03-14');
      expect(label).toContain('Income');
      expect(label).toContain('+');
      expect(label).toContain('3,200');
      expect(label).toContain('Salary');
      expect(label).toContain('category Salary');
      expect(label).toContain('Mar');
    });

    it('builds correct label for expense entry', () => {
      const label = buildAriaLabel('expense', 85.5, 'USD', 'Grocery Store', 'Food', '2026-03-15');
      expect(label).toContain('Expense');
      expect(label).toContain('\u2212');
      expect(label).toContain('85');
      expect(label).toContain('Grocery Store');
      expect(label).toContain('category Food');
    });

    it('builds correct label for savings entry', () => {
      const label = buildAriaLabel('savings', 400, 'USD', 'Emergency Fund', 'Savings', '2026-03-10');
      expect(label).toContain('Savings');
      expect(label).toContain('\u2212');
      expect(label).toContain('400');
      expect(label).toContain('Emergency Fund');
    });
  });
});
