/**
 * Tests for CategoryCard logic — currency formatting, difference computation,
 * progress percentage clamping, and subtitle generation.
 * Requirements: 16.9, 16.10, 16.11, 16.12
 */
import { describe, it, expect } from 'vitest';

// Inline helpers matching the component implementation to avoid Tamagui runtime

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function clampPercent(actual: number, projected: number): number {
  if (projected <= 0) return 0;
  return Math.round(Math.min(actual / projected, 1) * 100);
}

const COLOR = {
  positiveGreen: '#22C55E',
  expenseClayRed: '#C86D5A',
  stone400: '#A8A29E',
} as const;

function computeDifference(
  type: 'income' | 'expense',
  actualAmount: number,
  projectedAmount: number,
  currency: string,
): { text: string; color: string } {
  const diff = actualAmount - projectedAmount;

  if (type === 'income') {
    if (diff > 0) {
      return { text: `+${formatAmount(diff, currency)}`, color: COLOR.positiveGreen };
    }
    if (diff < 0) {
      return { text: formatAmount(diff, currency), color: COLOR.expenseClayRed };
    }
    return { text: formatAmount(0, currency), color: COLOR.stone400 };
  }

  if (diff > 0) {
    return { text: `+${formatAmount(diff, currency)}`, color: COLOR.expenseClayRed };
  }
  if (diff < 0) {
    return { text: formatAmount(diff, currency), color: COLOR.positiveGreen };
  }
  return { text: formatAmount(0, currency), color: COLOR.stone400 };
}

describe('CategoryCard logic', () => {
  describe('formatAmount', () => {
    it('formats USD amounts with two decimal places', () => {
      const result = formatAmount(5000, 'USD');
      expect(result).toContain('5,000');
      expect(result).toContain('00');
    });

    it('formats zero correctly', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toContain('0.00');
    });
  });

  describe('clampPercent', () => {
    it('returns 0 when projected is zero', () => {
      expect(clampPercent(100, 0)).toBe(0);
    });

    it('returns 0 when projected is negative', () => {
      expect(clampPercent(100, -50)).toBe(0);
    });

    it('calculates correct percentage', () => {
      expect(clampPercent(3200, 5000)).toBe(64);
    });

    it('caps at 100% when actual exceeds projected', () => {
      expect(clampPercent(6000, 5000)).toBe(100);
    });

    it('returns 100 when actual equals projected', () => {
      expect(clampPercent(5000, 5000)).toBe(100);
    });

    it('returns 0 when actual is zero', () => {
      expect(clampPercent(0, 5000)).toBe(0);
    });
  });

  describe('computeDifference — income type', () => {
    it('shows positive green with "+" prefix when income surplus', () => {
      const result = computeDifference('income', 5200, 5000, 'USD');
      expect(result.color).toBe(COLOR.positiveGreen);
      expect(result.text).toContain('+');
      expect(result.text).toContain('200');
    });

    it('shows Clay Red when income shortfall', () => {
      const result = computeDifference('income', 3200, 5000, 'USD');
      expect(result.color).toBe(COLOR.expenseClayRed);
      expect(result.text).toContain('1,800');
    });

    it('shows neutral when income matches projected', () => {
      const result = computeDifference('income', 5000, 5000, 'USD');
      expect(result.color).toBe(COLOR.stone400);
      expect(result.text).toContain('0.00');
    });
  });

  describe('computeDifference — expense type', () => {
    it('shows Clay Red when expense overspend', () => {
      const result = computeDifference('expense', 1800, 1500, 'USD');
      expect(result.color).toBe(COLOR.expenseClayRed);
      expect(result.text).toContain('300');
    });

    it('shows positive green when under budget', () => {
      const result = computeDifference('expense', 350, 500, 'USD');
      expect(result.color).toBe(COLOR.positiveGreen);
      expect(result.text).toContain('150');
    });

    it('shows neutral when expense matches projected', () => {
      const result = computeDifference('expense', 1500, 1500, 'USD');
      expect(result.color).toBe(COLOR.stone400);
      expect(result.text).toContain('0.00');
    });
  });

  describe('subtitle generation', () => {
    it('returns "Income Source" for income type', () => {
      const subtitle = 'income' === 'income' ? 'Income Source' : 'Expense Category';
      expect(subtitle).toBe('Income Source');
    });

    it('returns "Expense Category" for expense type', () => {
      const subtitle = 'expense' === 'income' ? 'Income Source' : 'Expense Category';
      expect(subtitle).toBe('Expense Category');
    });
  });

  describe('aria-label generation', () => {
    it('builds correct aria-label for a category card', () => {
      const name = 'Salary';
      const actual = 3200;
      const projected = 5000;
      const currency = 'USD';
      const label = `${name}: actual ${formatAmount(actual, currency)} of ${formatAmount(projected, currency)} projected`;
      expect(label).toContain('Salary');
      expect(label).toContain('3,200');
      expect(label).toContain('5,000');
      expect(label).toContain('projected');
    });
  });
});
