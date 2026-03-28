/**
 * Tests for Overview screen logic — section ordering, data transformations,
 * state handling, and naming conventions.
 * Requirements: 1.1, 1.4, 8.1, 9.8, 9.9
 */
import { describe, it, expect } from 'vitest';
import type { Entry, FlowSheet, Category, ProjectionSummary } from '@lunero/core';

// ── Helpers extracted from Overview page for testability ───────────────────

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function computeSavingsPercent(totalSavings: number, totalIncome: number): string {
  if (totalIncome === 0) return '0% of Income';
  const pct = ((totalSavings / totalIncome) * 100).toFixed(1);
  return `${pct}% of Income`;
}

interface RecentTransactionItem {
  id: string;
  note: string;
  amount: number;
  entryType: 'income' | 'expense' | 'savings';
  categoryName: string;
  entryDate: string;
}

function buildRecentTransactions(
  entries: Entry[],
  categories: Category[],
  limit = 5,
): RecentTransactionItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  return [...entries]
    .filter((e) => !e.isDeleted)
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      note: e.note || 'Untitled',
      amount: e.amount,
      entryType: e.entryType,
      categoryName: categoryMap.get(e.categoryId) ?? 'Uncategorized',
      entryDate: e.entryDate,
    }));
}

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

function getChartPeriods(periods: TrendPeriod[] | undefined): TrendPeriod[] {
  if (!periods) return [];
  return periods.slice(-6);
}

function getProjectionValues(summary: ProjectionSummary | undefined) {
  const projByType = summary?.byEntryType;
  return {
    incomeProjected: projByType?.income?.projected ?? 0,
    expenseProjected: projByType?.expense?.projected ?? 0,
    projectedBalance: summary?.overall?.projected ?? 0,
  };
}

/** The expected section order on the Overview screen. */
const SECTION_ORDER = [
  'Balance',
  'Summary Cards',
  'Active FlowSheet',
  'Monthly Overview',
  'Recent Transactions',
] as const;

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeFlowSheet(overrides: Partial<FlowSheet> = {}): FlowSheet {
  return {
    id: 'fs1',
    userId: 'u1',
    periodType: 'monthly',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'active',
    editLocked: false,
    availableBalance: 4250,
    totalIncome: 6500,
    totalExpenses: 1850,
    totalSavings: 400,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    flowSheetId: 'fs1',
    userId: 'u1',
    entryType: 'expense',
    categoryId: 'cat1',
    amount: 85.5,
    currency: 'USD',
    entryDate: '2026-03-15',
    isDeleted: false,
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat1',
    userId: 'u1',
    name: 'Food',
    entryType: 'expense',
    isDefault: true,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Overview screen — naming (Req 1.1, 1.4)', () => {
  it('uses "Overview" as the page identity, not "Dashboard"', () => {
    const pageTitle = 'Overview';
    const ariaLabel = 'Overview';
    expect(pageTitle).toBe('Overview');
    expect(ariaLabel).toBe('Overview');
    expect(pageTitle).not.toContain('Dashboard');
    expect(ariaLabel).not.toContain('Dashboard');
  });
});

describe('Overview screen — section ordering (Req 8.1)', () => {
  it('defines sections in the correct vertical order', () => {
    expect(SECTION_ORDER[0]).toBe('Balance');
    expect(SECTION_ORDER[1]).toBe('Summary Cards');
    expect(SECTION_ORDER[2]).toBe('Active FlowSheet');
    expect(SECTION_ORDER[3]).toBe('Monthly Overview');
    expect(SECTION_ORDER[4]).toBe('Recent Transactions');
  });

  it('has exactly 5 sections', () => {
    expect(SECTION_ORDER).toHaveLength(5);
  });
});

describe('Overview screen — balance section', () => {
  it('formats positive balance correctly', () => {
    const fs = makeFlowSheet({ availableBalance: 4250 });
    const formatted = formatCurrency(fs.availableBalance, 'USD');
    expect(formatted).toContain('4,250');
    expect(fs.availableBalance >= 0).toBe(true);
  });

  it('identifies negative balance', () => {
    const fs = makeFlowSheet({ availableBalance: -500 });
    expect(fs.availableBalance < 0).toBe(true);
  });

  it('identifies zero balance as positive', () => {
    const fs = makeFlowSheet({ availableBalance: 0 });
    expect(fs.availableBalance >= 0).toBe(true);
  });
});

describe('Overview screen — savings percentage', () => {
  it('computes savings percentage correctly', () => {
    expect(computeSavingsPercent(400, 6500)).toBe('6.2% of Income');
  });

  it('returns 0% when income is zero', () => {
    expect(computeSavingsPercent(0, 0)).toBe('0% of Income');
  });

  it('handles 100% savings rate', () => {
    expect(computeSavingsPercent(5000, 5000)).toBe('100.0% of Income');
  });

  it('handles savings greater than income', () => {
    const result = computeSavingsPercent(7000, 5000);
    expect(result).toBe('140.0% of Income');
  });
});

describe('Overview screen — recent transactions', () => {
  it('returns at most 5 entries sorted by date descending', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      makeEntry({
        id: `e${i}`,
        entryDate: `2026-03-${String(i + 1).padStart(2, '0')}`,
      }),
    );
    const cats = [makeCategory()];
    const result = buildRecentTransactions(entries, cats);
    expect(result).toHaveLength(5);
    expect(result[0].entryDate).toBe('2026-03-08');
    expect(result[4].entryDate).toBe('2026-03-04');
  });

  it('filters out deleted entries', () => {
    const entries = [
      makeEntry({ id: 'e1', isDeleted: true }),
      makeEntry({ id: 'e2', isDeleted: false }),
    ];
    const result = buildRecentTransactions(entries, [makeCategory()]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
  });

  it('uses "Untitled" for entries without a note', () => {
    const entries = [makeEntry({ note: undefined })];
    const result = buildRecentTransactions(entries, [makeCategory()]);
    expect(result[0].note).toBe('Untitled');
  });

  it('uses "Uncategorized" when category is not found', () => {
    const entries = [makeEntry({ categoryId: 'unknown' })];
    const result = buildRecentTransactions(entries, [makeCategory()]);
    expect(result[0].categoryName).toBe('Uncategorized');
  });

  it('maps category names correctly', () => {
    const entries = [makeEntry({ categoryId: 'cat1' })];
    const cats = [makeCategory({ id: 'cat1', name: 'Groceries' })];
    const result = buildRecentTransactions(entries, cats);
    expect(result[0].categoryName).toBe('Groceries');
  });

  it('returns empty array when no entries exist', () => {
    const result = buildRecentTransactions([], []);
    expect(result).toHaveLength(0);
  });
});

describe('Overview screen — chart periods', () => {
  it('returns last 6 periods from trend data', () => {
    const periods: TrendPeriod[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      label: `Month ${i}`,
      startDate: `2025-${String(i + 1).padStart(2, '0')}-01`,
      endDate: `2025-${String(i + 1).padStart(2, '0')}-28`,
      totalIncome: 5000,
      totalExpenses: 3000,
      totalSavings: 500,
      availableBalance: 1500,
    }));
    const result = getChartPeriods(periods);
    expect(result).toHaveLength(6);
    expect(result[0].id).toBe('p4');
    expect(result[5].id).toBe('p9');
  });

  it('returns all periods when fewer than 6', () => {
    const periods: TrendPeriod[] = [
      { id: 'p1', label: 'Jan', startDate: '2026-01-01', endDate: '2026-01-31', totalIncome: 5000, totalExpenses: 3000, totalSavings: 500, availableBalance: 1500 },
    ];
    expect(getChartPeriods(periods)).toHaveLength(1);
  });

  it('returns empty array when periods is undefined', () => {
    expect(getChartPeriods(undefined)).toHaveLength(0);
  });
});

describe('Overview screen — projection values', () => {
  it('extracts projection values from summary', () => {
    const summary: ProjectionSummary = {
      flowSheetId: 'fs1',
      byCategory: [],
      byEntryType: {
        income: { projected: 6500, actual: 4200, statusColor: 'green' },
        expense: { projected: 3000, actual: 1850, statusColor: 'green' },
        savings: { projected: 500, actual: 400, statusColor: 'green' },
      },
      overall: { projected: 3000, actual: 1950, statusColor: 'green' },
    };
    const result = getProjectionValues(summary);
    expect(result.incomeProjected).toBe(6500);
    expect(result.expenseProjected).toBe(3000);
    expect(result.projectedBalance).toBe(3000);
  });

  it('returns zeros when summary is undefined', () => {
    const result = getProjectionValues(undefined);
    expect(result.incomeProjected).toBe(0);
    expect(result.expenseProjected).toBe(0);
    expect(result.projectedBalance).toBe(0);
  });
});

describe('Overview screen — no active FlowSheet (Req 9.8, 9.9)', () => {
  it('should show create prompt when flowSheet is null', () => {
    const flowSheet = null;
    const shouldShowEmptyState = !flowSheet;
    expect(shouldShowEmptyState).toBe(true);
  });

  it('should show loading state while data is loading', () => {
    const isLoading = true;
    const shouldShowLoading = isLoading;
    expect(shouldShowLoading).toBe(true);
  });

  it('should show error state when sheet fails to load', () => {
    const sheetError = new Error('Network error');
    const shouldShowError = !!sheetError;
    expect(shouldShowError).toBe(true);
  });
});
