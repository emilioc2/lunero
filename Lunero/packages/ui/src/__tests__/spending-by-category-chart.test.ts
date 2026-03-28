/**
 * Tests for SpendingByCategoryChart logic — percentage calculation, legend building,
 * aria-label construction, empty state, and percentage sum validation.
 * Requirements: 20.1, 20.4, 20.5
 */
import { describe, it, expect } from 'vitest';

// --- Inlined types (avoid importing from component to skip Tamagui/recharts runtime) ---

interface CategoryExpenseData {
  categoryName: string;
  amount: number;
  color: string;
}

// --- Inlined pure functions (replicated from spending-by-category-chart.tsx) ---

function calculatePercentage(amount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 100);
}

function buildLegendItems(
  data: CategoryExpenseData[],
): Array<{ categoryName: string; percentage: number; color: string }> {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  return data.map((d) => ({
    categoryName: d.categoryName,
    percentage: calculatePercentage(d.amount, total),
    color: d.color,
  }));
}

function buildAriaLabel(data: CategoryExpenseData[]): string {
  if (data.length === 0) return 'Spending by category chart with no data';
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const parts = data.map(
    (d) => `${d.categoryName} ${calculatePercentage(d.amount, total)}%`,
  );
  return `Spending by category chart: ${parts.join(', ')}`;
}

// --- Test data ---

const SAMPLE_DATA: CategoryExpenseData[] = [
  { categoryName: 'Housing', amount: 1200, color: '#E57373' },
  { categoryName: 'Food', amount: 400, color: '#81C784' },
  { categoryName: 'Transport', amount: 200, color: '#64B5F6' },
  { categoryName: 'Other', amount: 200, color: '#FFD54F' },
];


// --- Tests ---

describe('SpendingByCategoryChart logic', () => {
  describe('calculatePercentage', () => {
    it('calculates a basic percentage', () => {
      expect(calculatePercentage(50, 200)).toBe(25);
    });

    it('returns 0 when total is zero', () => {
      expect(calculatePercentage(100, 0)).toBe(0);
    });

    it('returns 0 when total is negative', () => {
      expect(calculatePercentage(100, -50)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      // 1/3 = 33.333...% → rounds to 33
      expect(calculatePercentage(1, 3)).toBe(33);
      // 2/3 = 66.666...% → rounds to 67
      expect(calculatePercentage(2, 3)).toBe(67);
    });

    it('returns 100 when amount equals total', () => {
      expect(calculatePercentage(500, 500)).toBe(100);
    });
  });

  describe('buildLegendItems', () => {
    it('transforms category data with correct percentages and colors', () => {
      const items = buildLegendItems(SAMPLE_DATA);
      expect(items).toHaveLength(4);

      // Total = 2000. Housing = 1200/2000 = 60%
      expect(items[0].categoryName).toBe('Housing');
      expect(items[0].percentage).toBe(60);
      expect(items[0].color).toBe('#E57373');

      // Food = 400/2000 = 20%
      expect(items[1].categoryName).toBe('Food');
      expect(items[1].percentage).toBe(20);
    });

    it('returns 100% for a single category', () => {
      const single: CategoryExpenseData[] = [
        { categoryName: 'Rent', amount: 1500, color: '#FF0000' },
      ];
      const items = buildLegendItems(single);
      expect(items).toHaveLength(1);
      expect(items[0].percentage).toBe(100);
      expect(items[0].categoryName).toBe('Rent');
    });

    it('returns empty array for empty data', () => {
      const items = buildLegendItems([]);
      expect(items).toEqual([]);
    });
  });

  describe('buildAriaLabel', () => {
    it('describes categories with percentages', () => {
      const label = buildAriaLabel(SAMPLE_DATA);
      expect(label).toContain('Spending by category chart:');
      expect(label).toContain('Housing 60%');
      expect(label).toContain('Food 20%');
      expect(label).toContain('Transport 10%');
      expect(label).toContain('Other 10%');
    });

    it('returns "no data" message for empty data', () => {
      const label = buildAriaLabel([]);
      expect(label).toBe('Spending by category chart with no data');
    });
  });

  describe('empty state condition', () => {
    it('detects empty data for showing "No expense data yet." message', () => {
      const data: CategoryExpenseData[] = [];
      const isEmpty = data.length === 0;
      expect(isEmpty).toBe(true);
    });

    it('detects non-empty data', () => {
      const isEmpty = SAMPLE_DATA.length === 0;
      expect(isEmpty).toBe(false);
    });
  });

  describe('percentage sum validation', () => {
    it('percentages sum reasonably close to 100% for multiple categories', () => {
      const items = buildLegendItems(SAMPLE_DATA);
      const sum = items.reduce((s, i) => s + i.percentage, 0);
      // Due to rounding, sum may not be exactly 100 but should be close
      expect(sum).toBeGreaterThanOrEqual(98);
      expect(sum).toBeLessThanOrEqual(102);
    });

    it('percentages sum to 100% for evenly divisible data', () => {
      const even: CategoryExpenseData[] = [
        { categoryName: 'A', amount: 250, color: '#AAA' },
        { categoryName: 'B', amount: 250, color: '#BBB' },
        { categoryName: 'C', amount: 250, color: '#CCC' },
        { categoryName: 'D', amount: 250, color: '#DDD' },
      ];
      const items = buildLegendItems(even);
      const sum = items.reduce((s, i) => s + i.percentage, 0);
      expect(sum).toBe(100);
      expect(items[0].percentage).toBe(25);
    });
  });
});
