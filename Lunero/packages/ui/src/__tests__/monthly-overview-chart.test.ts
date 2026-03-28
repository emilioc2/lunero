/**
 * Tests for MonthlyOverviewChart logic — data transformation, currency formatting,
 * month abbreviation extraction, legend configuration, and aria-label construction.
 * Requirements: 6.2, 6.4, 6.7
 */
import { describe, it, expect } from 'vitest';

// --- Inlined types (avoid importing from component to skip Tamagui runtime) ---

interface TrendPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  availableBalance: number;
}

interface ChartDataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

// --- Inlined pure functions (replicated from monthly-overview-chart.tsx) ---

function formatCompactCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getMonthAbbreviation(startDate: string, label: string): string {
  const date = new Date(startDate);
  if (!isNaN(date.getTime())) {
    return date.toLocaleString(undefined, { month: 'short' });
  }
  return label.length > 3 ? label.slice(0, 3) : label;
}

function buildChartData(periods: TrendPeriod[]): ChartDataPoint[] {
  return periods.map((p) => ({
    month: getMonthAbbreviation(p.startDate, p.label),
    income: p.totalIncome,
    expenses: p.totalExpenses,
    savings: p.totalSavings,
  }));
}


// --- Inlined constants (replicated from monthly-overview-chart.tsx) ---

const BAR_COLORS = {
  income: '#6B6F69',
  expenses: '#C86D5A',
  savings: '#C4A484',
} as const;

const LEGEND_ITEMS = [
  { key: 'income', label: 'Income', color: BAR_COLORS.income },
  { key: 'expenses', label: 'Expenses', color: BAR_COLORS.expenses },
  { key: 'savings', label: 'Savings', color: BAR_COLORS.savings },
] as const;

/** Builds the aria-label string that the BarChart receives. */
function buildAriaLabel(dataLength: number): string {
  return `Monthly overview bar chart showing income, expenses, and savings for ${dataLength} months`;
}

// --- Test data ---

function makePeriod(overrides: Partial<TrendPeriod> & { id: string }): TrendPeriod {
  return {
    label: 'Period',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    availableBalance: 0,
    ...overrides,
  };
}

const SIX_MONTHS: TrendPeriod[] = [
  makePeriod({ id: '1', label: 'October 2025', startDate: '2025-10-01', endDate: '2025-10-31', totalIncome: 5000, totalExpenses: 3000, totalSavings: 500, availableBalance: 1500 }),
  makePeriod({ id: '2', label: 'November 2025', startDate: '2025-11-01', endDate: '2025-11-30', totalIncome: 5200, totalExpenses: 3100, totalSavings: 600, availableBalance: 1500 }),
  makePeriod({ id: '3', label: 'December 2025', startDate: '2025-12-01', endDate: '2025-12-31', totalIncome: 5500, totalExpenses: 4000, totalSavings: 400, availableBalance: 1100 }),
  makePeriod({ id: '4', label: 'January 2026', startDate: '2026-01-01', endDate: '2026-01-31', totalIncome: 5000, totalExpenses: 2800, totalSavings: 700, availableBalance: 1500 }),
  makePeriod({ id: '5', label: 'February 2026', startDate: '2026-02-01', endDate: '2026-02-28', totalIncome: 4800, totalExpenses: 2900, totalSavings: 500, availableBalance: 1400 }),
  makePeriod({ id: '6', label: 'March 2026', startDate: '2026-03-01', endDate: '2026-03-31', totalIncome: 6500, totalExpenses: 1850, totalSavings: 400, availableBalance: 4250 }),
];


// --- Tests ---

describe('MonthlyOverviewChart logic', () => {
  describe('buildChartData', () => {
    it('transforms 6 months of TrendPeriod data into ChartDataPoints', () => {
      const data = buildChartData(SIX_MONTHS);
      expect(data).toHaveLength(6);

      expect(data[0].income).toBe(5000);
      expect(data[0].expenses).toBe(3000);
      expect(data[0].savings).toBe(500);

      expect(data[5].income).toBe(6500);
      expect(data[5].expenses).toBe(1850);
      expect(data[5].savings).toBe(400);
    });

    it('extracts abbreviated month names from startDate', () => {
      const data = buildChartData(SIX_MONTHS);
      for (const point of data) {
        expect(point.month.length).toBeLessThanOrEqual(4);
        expect(point.month.length).toBeGreaterThan(0);
      }
    });

    it('returns an empty array when given no periods', () => {
      const data = buildChartData([]);
      expect(data).toEqual([]);
    });

    it('preserves period ordering', () => {
      const data = buildChartData(SIX_MONTHS);
      expect(data[0].income).toBe(SIX_MONTHS[0].totalIncome);
      expect(data[3].income).toBe(SIX_MONTHS[3].totalIncome);
      expect(data[5].income).toBe(SIX_MONTHS[5].totalIncome);
    });
  });

  describe('formatCompactCurrency', () => {
    it('formats large USD amounts in compact notation', () => {
      const result = formatCompactCurrency(5000, 'USD');
      expect(result).toContain('5');
      expect(result.length).toBeLessThan(10);
    });

    it('formats zero correctly', () => {
      const result = formatCompactCurrency(0, 'USD');
      expect(result).toContain('0');
    });

    it('formats EUR amounts', () => {
      const result = formatCompactCurrency(1200, 'EUR');
      expect(result).toContain('1');
    });

    it('formats small amounts without compact suffix', () => {
      const result = formatCompactCurrency(50, 'USD');
      expect(result).toContain('50');
    });

    it('formats very large amounts with compact suffix', () => {
      const result = formatCompactCurrency(1500000, 'USD');
      expect(result).toContain('1');
      expect(result.length).toBeLessThan(10);
    });
  });

  describe('getMonthAbbreviation', () => {
    it('returns abbreviated month from a valid startDate', () => {
      const abbr = getMonthAbbreviation('2026-03-01', 'March 2026');
      expect(abbr.length).toBeLessThanOrEqual(4);
      expect(abbr.length).toBeGreaterThan(0);
    });

    it('falls back to first 3 chars of label for invalid date', () => {
      const abbr = getMonthAbbreviation('not-a-date', 'March 2026');
      expect(abbr).toBe('Mar');
    });

    it('returns full label when label is 3 chars or fewer and date is invalid', () => {
      const abbr = getMonthAbbreviation('invalid', 'Oct');
      expect(abbr).toBe('Oct');
    });

    it('returns full label when label is shorter than 3 chars and date is invalid', () => {
      const abbr = getMonthAbbreviation('invalid', 'Q1');
      expect(abbr).toBe('Q1');
    });
  });

  describe('LEGEND_ITEMS and BAR_COLORS', () => {
    it('defines exactly 3 legend items', () => {
      expect(LEGEND_ITEMS).toHaveLength(3);
    });

    it('uses correct brand colors for income, expenses, savings', () => {
      expect(BAR_COLORS.income).toBe('#6B6F69');
      expect(BAR_COLORS.expenses).toBe('#C86D5A');
      expect(BAR_COLORS.savings).toBe('#C4A484');
    });

    it('legend items match BAR_COLORS', () => {
      const incomeItem = LEGEND_ITEMS.find((i) => i.key === 'income');
      const expensesItem = LEGEND_ITEMS.find((i) => i.key === 'expenses');
      const savingsItem = LEGEND_ITEMS.find((i) => i.key === 'savings');

      expect(incomeItem?.color).toBe('#6B6F69');
      expect(expensesItem?.color).toBe('#C86D5A');
      expect(savingsItem?.color).toBe('#C4A484');
    });

    it('legend items have correct labels', () => {
      expect(LEGEND_ITEMS[0].label).toBe('Income');
      expect(LEGEND_ITEMS[1].label).toBe('Expenses');
      expect(LEGEND_ITEMS[2].label).toBe('Savings');
    });
  });

  describe('aria-label construction', () => {
    it('includes month count for 6 months of data', () => {
      const label = buildAriaLabel(6);
      expect(label).toContain('6 months');
      expect(label).toContain('income');
      expect(label).toContain('expenses');
      expect(label).toContain('savings');
    });

    it('includes month count for 0 months', () => {
      const label = buildAriaLabel(0);
      expect(label).toContain('0 months');
    });

    it('includes month count for 3 months', () => {
      const label = buildAriaLabel(3);
      expect(label).toContain('3 months');
    });
  });
});
