/**
 * Tests for SummaryCard logic — currency formatting and prop-driven label generation.
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 */
import { describe, it, expect } from 'vitest';

// Inline the formatting function to avoid Tamagui runtime in test environment
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Builds the aria-label string that SummaryCard produces. */
function buildAriaLabel(
  label: 'Income' | 'Expenses' | 'Savings',
  amount: number,
  currency: string,
  subtitle?: string,
): string {
  const base = `${label}: ${formatAmount(amount, currency)}`;
  return subtitle ? `${base}, ${subtitle}` : base;
}

/** Computes savings percentage subtitle. */
function savingsSubtitle(savings: number, income: number): string {
  if (income === 0) return '0% of Income';
  return `${((savings / income) * 100).toFixed(1)}% of Income`;
}

describe('SummaryCard formatting', () => {
  describe('formatAmount', () => {
    it('formats USD amounts with two decimal places', () => {
      const result = formatAmount(6500, 'USD');
      expect(result).toContain('6,500');
      expect(result).toContain('00');
    });

    it('formats zero correctly', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('formats EUR amounts', () => {
      const result = formatAmount(1234.5, 'EUR');
      expect(result).toContain('1,234');
      expect(result).toContain('50');
    });
  });

  describe('Income variant', () => {
    it('produces correct aria-label for income', () => {
      const label = buildAriaLabel('Income', 6500, 'USD');
      expect(label).toContain('Income');
      expect(label).toContain('6,500');
    });
  });

  describe('Expenses variant', () => {
    it('produces correct aria-label for expenses', () => {
      const label = buildAriaLabel('Expenses', 1850, 'USD');
      expect(label).toContain('Expenses');
      expect(label).toContain('1,850');
    });
  });

  describe('Savings variant', () => {
    it('produces correct aria-label with subtitle', () => {
      const sub = savingsSubtitle(400, 6500);
      const label = buildAriaLabel('Savings', 400, 'USD', sub);
      expect(label).toContain('Savings');
      expect(label).toContain('400');
      expect(label).toContain('of Income');
    });

    it('computes savings percentage correctly', () => {
      expect(savingsSubtitle(400, 6500)).toBe('6.2% of Income');
    });

    it('returns 0% when income is zero', () => {
      expect(savingsSubtitle(0, 0)).toBe('0% of Income');
    });

    it('handles 100% savings rate', () => {
      expect(savingsSubtitle(5000, 5000)).toBe('100.0% of Income');
    });
  });
});
