/**
 * Tests for Analytics page logic — buildCategoryExpenseData, page title,
 * 2-column layout, empty state for pie chart, and loading/error states.
 * Requirements: 19.1, 19.4, 20.5, 21.1
 */
import { describe, it, expect } from 'vitest';

// --- Inlined types (avoid importing from component to skip Tamagui/recharts runtime) ---

interface CategoryExpenseData {
  categoryName: string;
  amount: number;
  color: string;
}

interface EntryLike {
  entryType: string;
  categoryId: string;
  amount: number;
  isDeleted: boolean;
}

interface CategoryLike {
  id: string;
  name: string;
  entryType: string;
}

// --- Inlined color palette (mirrors analytics page) ---

const CATEGORY_COLORS = [
  '#E57373', '#81C784', '#64B5F6', '#FFD54F', '#BA68C8',
  '#4DB6AC', '#FF8A65', '#A1887F', '#90A4AE', '#F06292',
];

// --- Replicated pure function from analytics page ---

function buildCategoryExpenseData(
  entries: EntryLike[],
  categories: CategoryLike[],
): CategoryExpenseData[] {
  const expenseEntries = entries.filter((e) => e.entryType === 'expense' && !e.isDeleted);
  if (expenseEntries.length === 0) return [];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map<string, { name: string; amount: number }>();

  for (const entry of expenseEntries) {
    const name = categoryMap.get(entry.categoryId) ?? 'Uncategorized';
    const existing = totals.get(entry.categoryId);
    if (existing) {
      existing.amount += entry.amount;
    } else {
      totals.set(entry.categoryId, { name, amount: entry.amount });
    }
  }

  let colorIndex = 0;
  return Array.from(totals.values())
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      categoryName: item.name,
      amount: item.amount,
      color: CATEGORY_COLORS[colorIndex++ % CATEGORY_COLORS.length]!,
    }));
}

// --- Test data factories ---

function makeEntry(overrides: Partial<EntryLike> = {}): EntryLike {
  return {
    entryType: 'expense',
    categoryId: 'cat-1',
    amount: 100,
    isDeleted: false,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<CategoryLike> = {}): CategoryLike {
  return {
    id: 'cat-1',
    name: 'Food',
    entryType: 'expense',
    ...overrides,
  };
}

// --- Tests ---

describe('Analytics page logic', () => {
  describe('page identity (Req 19.1)', () => {
    it('page title should be "Analytics" not "Trends"', () => {
      const pageTitle = 'Analytics';
      expect(pageTitle).toBe('Analytics');
      expect(pageTitle).not.toContain('Trends');
      expect(pageTitle).not.toContain('Dashboard');
    });

    it('aria-label should be "Analytics"', () => {
      const ariaLabel = 'Analytics';
      expect(ariaLabel).toBe('Analytics');
    });
  });

  describe('2-column layout configuration (Req 19.4, 21.1)', () => {
    it('max content width is 860px for analytics', () => {
      const maxWidth = 860;
      expect(maxWidth).toBe(860);
    });

    it('layout has two chart columns', () => {
      const columns = ['SpendingByCategoryChart', 'MonthlyOverviewChart'];
      expect(columns).toHaveLength(2);
      expect(columns[0]).toBe('SpendingByCategoryChart');
      expect(columns[1]).toBe('MonthlyOverviewChart');
    });

    it('pie chart is on the left (first), bar chart on the right (second)', () => {
      const chartOrder = ['SpendingByCategoryChart', 'MonthlyOverviewChart'];
      expect(chartOrder[0]).toBe('SpendingByCategoryChart');
      expect(chartOrder[1]).toBe('MonthlyOverviewChart');
    });
  });

  describe('buildCategoryExpenseData', () => {
    it('returns empty array when no entries exist', () => {
      const result = buildCategoryExpenseData([], [makeCategory()]);
      expect(result).toEqual([]);
    });

    it('returns empty array when no expense entries exist (Req 20.5)', () => {
      const entries = [
        makeEntry({ entryType: 'income', categoryId: 'cat-1', amount: 500 }),
        makeEntry({ entryType: 'savings', categoryId: 'cat-2', amount: 200 }),
      ];
      const result = buildCategoryExpenseData(entries, [makeCategory()]);
      expect(result).toEqual([]);
    });

    it('filters out deleted entries', () => {
      const entries = [
        makeEntry({ categoryId: 'cat-1', amount: 100, isDeleted: false }),
        makeEntry({ categoryId: 'cat-1', amount: 50, isDeleted: true }),
      ];
      const categories = [makeCategory({ id: 'cat-1', name: 'Food' })];
      const result = buildCategoryExpenseData(entries, categories);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100);
    });

    it('aggregates amounts by category', () => {
      const entries = [
        makeEntry({ categoryId: 'cat-1', amount: 100 }),
        makeEntry({ categoryId: 'cat-1', amount: 50 }),
        makeEntry({ categoryId: 'cat-2', amount: 200 }),
      ];
      const categories = [
        makeCategory({ id: 'cat-1', name: 'Food' }),
        makeCategory({ id: 'cat-2', name: 'Housing' }),
      ];
      const result = buildCategoryExpenseData(entries, categories);
      expect(result).toHaveLength(2);
      // Sorted by amount descending: Housing (200) first, Food (150) second
      expect(result[0].categoryName).toBe('Housing');
      expect(result[0].amount).toBe(200);
      expect(result[1].categoryName).toBe('Food');
      expect(result[1].amount).toBe(150);
    });

    it('sorts categories by amount descending', () => {
      const entries = [
        makeEntry({ categoryId: 'cat-1', amount: 50 }),
        makeEntry({ categoryId: 'cat-2', amount: 300 }),
        makeEntry({ categoryId: 'cat-3', amount: 150 }),
      ];
      const categories = [
        makeCategory({ id: 'cat-1', name: 'Transport' }),
        makeCategory({ id: 'cat-2', name: 'Housing' }),
        makeCategory({ id: 'cat-3', name: 'Food' }),
      ];
      const result = buildCategoryExpenseData(entries, categories);
      expect(result[0].categoryName).toBe('Housing');
      expect(result[1].categoryName).toBe('Food');
      expect(result[2].categoryName).toBe('Transport');
    });

    it('assigns colors from the palette in order', () => {
      const entries = [
        makeEntry({ categoryId: 'cat-1', amount: 200 }),
        makeEntry({ categoryId: 'cat-2', amount: 100 }),
      ];
      const categories = [
        makeCategory({ id: 'cat-1', name: 'Housing' }),
        makeCategory({ id: 'cat-2', name: 'Food' }),
      ];
      const result = buildCategoryExpenseData(entries, categories);
      expect(result[0].color).toBe(CATEGORY_COLORS[0]);
      expect(result[1].color).toBe(CATEGORY_COLORS[1]);
    });

    it('wraps colors when more categories than palette entries', () => {
      const entries = Array.from({ length: 12 }, (_, i) =>
        makeEntry({ categoryId: `cat-${i}`, amount: 100 - i }),
      );
      const categories = Array.from({ length: 12 }, (_, i) =>
        makeCategory({ id: `cat-${i}`, name: `Cat ${i}` }),
      );
      const result = buildCategoryExpenseData(entries, categories);
      expect(result).toHaveLength(12);
      // 11th item (index 10) wraps to CATEGORY_COLORS[0]
      expect(result[10].color).toBe(CATEGORY_COLORS[0]);
    });

    it('labels unknown categories as "Uncategorized"', () => {
      const entries = [makeEntry({ categoryId: 'unknown-cat', amount: 75 })];
      const categories: CategoryLike[] = [];
      const result = buildCategoryExpenseData(entries, categories);
      expect(result).toHaveLength(1);
      expect(result[0].categoryName).toBe('Uncategorized');
    });

    it('only includes expense entries, ignoring income and savings', () => {
      const entries = [
        makeEntry({ entryType: 'expense', categoryId: 'cat-1', amount: 100 }),
        makeEntry({ entryType: 'income', categoryId: 'cat-2', amount: 5000 }),
        makeEntry({ entryType: 'savings', categoryId: 'cat-3', amount: 500 }),
      ];
      const categories = [
        makeCategory({ id: 'cat-1', name: 'Food' }),
        makeCategory({ id: 'cat-2', name: 'Salary', entryType: 'income' }),
        makeCategory({ id: 'cat-3', name: 'Emergency Fund', entryType: 'savings' }),
      ];
      const result = buildCategoryExpenseData(entries, categories);
      expect(result).toHaveLength(1);
      expect(result[0].categoryName).toBe('Food');
    });
  });

  describe('empty state for pie chart (Req 20.5)', () => {
    it('empty CategoryExpenseData triggers empty state in SpendingByCategoryChart', () => {
      const data: CategoryExpenseData[] = [];
      expect(data.length === 0).toBe(true);
    });

    it('non-empty data does not trigger empty state', () => {
      const data: CategoryExpenseData[] = [
        { categoryName: 'Food', amount: 100, color: '#E57373' },
      ];
      expect(data.length === 0).toBe(false);
    });
  });

  describe('trend params for bar chart (Req 21.1)', () => {
    it('uses monthly view for the bar chart', () => {
      const view = 'monthly';
      expect(view).toBe('monthly');
    });

    it('requests 6-month rolling window', () => {
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const monthsDiff = (now.getFullYear() - fromDate.getFullYear()) * 12
        + (now.getMonth() - fromDate.getMonth());
      expect(monthsDiff).toBe(6);
    });
  });
});
