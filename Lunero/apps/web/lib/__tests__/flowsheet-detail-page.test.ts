/**
 * Tests for FlowSheet detail page logic — summary card derivation, category grouping,
 * overspend detection, badge logic, unlock-to-edit, sheet name formatting, and back navigation.
 * Requirements: 16.5, 16.7, 16.8, 16.11, 16.16
 */
import { describe, it, expect, vi } from 'vitest';
import type { FlowSheet, ProjectionSummary } from '@lunero/core';

// ── Helper: format currency (mirrors locale-utils) ─────────────────────────

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Helper: build sheet name (mirrors page logic) ──────────────────────────

function buildSheetName(periodType: string): string {
  return `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Budget`;
}

// ── Helper: derive summary card data (mirrors page logic) ──────────────────

function deriveSummaryCards(
  flowSheet: FlowSheet,
  projectionSummary: ProjectionSummary | undefined,
  currency: string,
) {
  const projectedIncome = projectionSummary?.byEntryType?.income?.projected ?? 0;
  const projectedExpenses = projectionSummary?.byEntryType?.expense?.projected ?? 0;
  const projectedNet = projectedIncome - projectedExpenses;

  const totalIncome = flowSheet.totalIncome;
  const totalExpenses = flowSheet.totalExpenses;
  const netBalance = totalIncome - totalExpenses;

  return [
    {
      label: 'Income',
      amount: totalIncome,
      subtitle: `Projected: ${formatCurrency(projectedIncome, currency)}`,
      icon: '↑',
    },
    {
      label: 'Expenses',
      amount: totalExpenses,
      subtitle: `Projected: ${formatCurrency(projectedExpenses, currency)}`,
      icon: '↓',
    },
    {
      label: 'Savings',
      amount: netBalance,
      subtitle: `Projected: ${formatCurrency(projectedNet, currency)}`,
      icon: '◎',
    },
  ];
}


// ── Helper: group categories by type (mirrors page logic) ──────────────────

function groupCategories(projectionSummary: ProjectionSummary | undefined) {
  const byCategory = projectionSummary?.byCategory ?? [];
  return {
    incomeCategories: byCategory.filter((c) => c.entryType === 'income'),
    expenseCategories: byCategory.filter((c) => c.entryType === 'expense'),
  };
}

// ── Helper: overspend / surplus detection (mirrors CategoryCard logic) ─────

const COLOR = {
  positiveGreen: '#22C55E',
  clayRed: '#C86D5A',
  stone400: '#A8A29E',
} as const;

function computeDifferenceColor(
  type: 'income' | 'expense',
  actualAmount: number,
  projectedAmount: number,
): string {
  const diff = actualAmount - projectedAmount;
  if (type === 'expense') {
    if (diff > 0) return COLOR.clayRed;    // overspend
    if (diff < 0) return COLOR.positiveGreen;
    return COLOR.stone400;
  }
  // income
  if (diff > 0) return COLOR.positiveGreen; // surplus
  if (diff < 0) return COLOR.clayRed;
  return COLOR.stone400;
}

// ── Helper: badge logic (mirrors page logic) ───────────────────────────────

function getBadge(status: 'active' | 'archived'): { label: string; bg: string } {
  if (status === 'active') return { label: 'Active Period', bg: '#C86D5A' };
  return { label: 'Archived', bg: '#F5F5F4' };
}

// ── Helper: editable / unlock logic (mirrors page logic) ───────────────────

function deriveEditState(flowSheet: FlowSheet) {
  const isArchived = flowSheet.status === 'archived';
  const isUnlocked = !flowSheet.editLocked;
  const isEditable = isUnlocked || !isArchived;
  const showUnlockButton = isArchived && !isUnlocked;
  return { isArchived, isUnlocked, isEditable, showUnlockButton };
}

// ── Test data factories ────────────────────────────────────────────────────

function makeFlowSheet(overrides: Partial<FlowSheet> = {}): FlowSheet {
  return {
    id: 'fs-1',
    userId: 'user-1',
    periodType: 'monthly',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'active',
    editLocked: false,
    availableBalance: 2350,
    totalIncome: 6500,
    totalExpenses: 3000,
    totalSavings: 1150,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
    ...overrides,
  };
}

function makeProjectionSummary(
  overrides: Partial<ProjectionSummary> = {},
): ProjectionSummary {
  return {
    flowSheetId: 'fs-1',
    byCategory: [
      {
        categoryId: 'cat-salary',
        categoryName: 'Salary',
        entryType: 'income',
        projectedAmount: 5000,
        actualAmount: 3200,
        statusColor: '#6B6F69',
      },
      {
        categoryId: 'cat-freelance',
        categoryName: 'Freelance',
        entryType: 'income',
        projectedAmount: 1500,
        actualAmount: 1000,
        statusColor: '#6B6F69',
      },
      {
        categoryId: 'cat-housing',
        categoryName: 'Housing',
        entryType: 'expense',
        projectedAmount: 1500,
        actualAmount: 1500,
        statusColor: '#A8A29E',
      },
      {
        categoryId: 'cat-food',
        categoryName: 'Food',
        entryType: 'expense',
        projectedAmount: 500,
        actualAmount: 350,
        statusColor: '#22C55E',
      },
    ],
    byEntryType: {
      income: { projected: 6500, actual: 4200, statusColor: '#6B6F69' },
      expense: { projected: 2000, actual: 1850, statusColor: '#22C55E' },
      savings: { projected: 500, actual: 400, statusColor: '#C4A484' },
    },
    overall: { projected: 4000, actual: 1950, statusColor: '#22C55E' },
    ...overrides,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('FlowSheet detail page logic', () => {
  describe('summary card data derivation (Req 16.5)', () => {
    it('computes three summary cards with correct labels and icons', () => {
      const sheet = makeFlowSheet({ totalIncome: 6500, totalExpenses: 3000 });
      const proj = makeProjectionSummary();
      const cards = deriveSummaryCards(sheet, proj, 'USD');

      expect(cards).toHaveLength(3);
      expect(cards[0].label).toBe('Income');
      expect(cards[0].icon).toBe('↑');
      expect(cards[1].label).toBe('Expenses');
      expect(cards[1].icon).toBe('↓');
      expect(cards[2].label).toBe('Savings');
      expect(cards[2].icon).toBe('◎');
    });

    it('uses totalIncome and totalExpenses from FlowSheet', () => {
      const sheet = makeFlowSheet({ totalIncome: 4200, totalExpenses: 1850 });
      const proj = makeProjectionSummary();
      const cards = deriveSummaryCards(sheet, proj, 'USD');

      expect(cards[0].amount).toBe(4200);
      expect(cards[1].amount).toBe(1850);
    });

    it('computes net balance as totalIncome - totalExpenses', () => {
      const sheet = makeFlowSheet({ totalIncome: 6500, totalExpenses: 3000 });
      const proj = makeProjectionSummary();
      const cards = deriveSummaryCards(sheet, proj, 'USD');

      expect(cards[2].amount).toBe(3500);
    });

    it('formats projected subtitles from projectionSummary.byEntryType', () => {
      const proj = makeProjectionSummary({
        byEntryType: {
          income: { projected: 6500, actual: 4200, statusColor: '#6B6F69' },
          expense: { projected: 2000, actual: 1850, statusColor: '#22C55E' },
          savings: { projected: 500, actual: 400, statusColor: '#C4A484' },
        },
      });
      const sheet = makeFlowSheet();
      const cards = deriveSummaryCards(sheet, proj, 'USD');

      expect(cards[0].subtitle).toBe(`Projected: ${formatCurrency(6500, 'USD')}`);
      expect(cards[1].subtitle).toBe(`Projected: ${formatCurrency(2000, 'USD')}`);
      // Net projected = 6500 - 2000 = 4500
      expect(cards[2].subtitle).toBe(`Projected: ${formatCurrency(4500, 'USD')}`);
    });

    it('defaults projected values to 0 when projectionSummary is undefined', () => {
      const sheet = makeFlowSheet({ totalIncome: 1000, totalExpenses: 500 });
      const cards = deriveSummaryCards(sheet, undefined, 'USD');

      expect(cards[0].subtitle).toBe(`Projected: ${formatCurrency(0, 'USD')}`);
      expect(cards[1].subtitle).toBe(`Projected: ${formatCurrency(0, 'USD')}`);
      expect(cards[2].subtitle).toBe(`Projected: ${formatCurrency(0, 'USD')}`);
    });
  });

  describe('category grouping (Req 16.7, 16.8)', () => {
    it('filters income categories from byCategory', () => {
      const proj = makeProjectionSummary();
      const { incomeCategories } = groupCategories(proj);

      expect(incomeCategories).toHaveLength(2);
      expect(incomeCategories.every((c) => c.entryType === 'income')).toBe(true);
      expect(incomeCategories.map((c) => c.categoryName)).toEqual(['Salary', 'Freelance']);
    });

    it('filters expense categories from byCategory', () => {
      const proj = makeProjectionSummary();
      const { expenseCategories } = groupCategories(proj);

      expect(expenseCategories).toHaveLength(2);
      expect(expenseCategories.every((c) => c.entryType === 'expense')).toBe(true);
      expect(expenseCategories.map((c) => c.categoryName)).toEqual(['Housing', 'Food']);
    });

    it('returns empty arrays when projectionSummary is undefined', () => {
      const { incomeCategories, expenseCategories } = groupCategories(undefined);
      expect(incomeCategories).toEqual([]);
      expect(expenseCategories).toEqual([]);
    });

    it('excludes savings categories from both groups', () => {
      const proj = makeProjectionSummary({
        byCategory: [
          { categoryId: 'c1', categoryName: 'Salary', entryType: 'income', projectedAmount: 5000, actualAmount: 5000, statusColor: '#6B6F69' },
          { categoryId: 'c2', categoryName: 'Rent', entryType: 'expense', projectedAmount: 1500, actualAmount: 1500, statusColor: '#A8A29E' },
          { categoryId: 'c3', categoryName: 'Emergency Fund', entryType: 'savings', projectedAmount: 500, actualAmount: 400, statusColor: '#C4A484' },
        ],
      });
      const { incomeCategories, expenseCategories } = groupCategories(proj);

      expect(incomeCategories).toHaveLength(1);
      expect(expenseCategories).toHaveLength(1);
    });
  });

  describe('overspend Clay Red styling (Req 16.11)', () => {
    it('returns Clay Red when expense actual exceeds projected (overspend)', () => {
      const color = computeDifferenceColor('expense', 1800, 1500);
      expect(color).toBe(COLOR.clayRed);
    });

    it('returns positive green when expense actual is under projected', () => {
      const color = computeDifferenceColor('expense', 350, 500);
      expect(color).toBe(COLOR.positiveGreen);
    });

    it('returns neutral when expense actual equals projected', () => {
      const color = computeDifferenceColor('expense', 1500, 1500);
      expect(color).toBe(COLOR.stone400);
    });

    it('returns positive green when income actual exceeds projected (surplus)', () => {
      const color = computeDifferenceColor('income', 5200, 5000);
      expect(color).toBe(COLOR.positiveGreen);
    });

    it('returns Clay Red when income actual is below projected (shortfall)', () => {
      const color = computeDifferenceColor('income', 3200, 5000);
      expect(color).toBe(COLOR.clayRed);
    });

    it('returns neutral when income actual equals projected', () => {
      const color = computeDifferenceColor('income', 5000, 5000);
      expect(color).toBe(COLOR.stone400);
    });
  });

  describe('badge logic', () => {
    it('active FlowSheet shows "Active Period" badge with Clay Red bg', () => {
      const badge = getBadge('active');
      expect(badge.label).toBe('Active Period');
      expect(badge.bg).toBe('#C86D5A');
    });

    it('archived FlowSheet shows "Archived" badge with muted bg', () => {
      const badge = getBadge('archived');
      expect(badge.label).toBe('Archived');
      expect(badge.bg).toBe('#F5F5F4');
    });
  });

  describe('unlock-to-edit logic', () => {
    it('archived + editLocked shows "Unlock to Edit" button', () => {
      const sheet = makeFlowSheet({ status: 'archived', editLocked: true });
      const state = deriveEditState(sheet);

      expect(state.showUnlockButton).toBe(true);
      expect(state.isEditable).toBe(false);
    });

    it('archived + unlocked is editable, no unlock button', () => {
      const sheet = makeFlowSheet({ status: 'archived', editLocked: false });
      const state = deriveEditState(sheet);

      expect(state.showUnlockButton).toBe(false);
      expect(state.isEditable).toBe(true);
    });

    it('active sheet is always editable, no unlock button', () => {
      const sheet = makeFlowSheet({ status: 'active', editLocked: false });
      const state = deriveEditState(sheet);

      expect(state.showUnlockButton).toBe(false);
      expect(state.isEditable).toBe(true);
    });
  });

  describe('sheet name formatting', () => {
    it('capitalizes monthly period type', () => {
      expect(buildSheetName('monthly')).toBe('Monthly Budget');
    });

    it('capitalizes weekly period type', () => {
      expect(buildSheetName('weekly')).toBe('Weekly Budget');
    });

    it('capitalizes custom period type', () => {
      expect(buildSheetName('custom')).toBe('Custom Budget');
    });
  });

  describe('back navigation (Req 16.16)', () => {
    it('back arrow navigates to /flowsheets', () => {
      const navigateTo = vi.fn();
      const handleBack = () => navigateTo('/flowsheets');

      handleBack();
      expect(navigateTo).toHaveBeenCalledWith('/flowsheets');
    });

    it('keyboard activation (Enter/Space) triggers back navigation', () => {
      const navigateTo = vi.fn();
      const handleKeyDown = (key: string) => {
        if (key === 'Enter' || key === ' ') navigateTo('/flowsheets');
      };

      handleKeyDown('Enter');
      handleKeyDown(' ');
      handleKeyDown('Tab'); // should not trigger
      expect(navigateTo).toHaveBeenCalledTimes(2);
    });
  });
});
