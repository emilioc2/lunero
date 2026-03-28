'use client';

import { useMemo } from 'react';
import { Text } from '@tamagui/core';
import { YStack, XStack, SpendingByCategoryChart, MonthlyOverviewChart } from '@lunero/ui';
import type { CategoryExpenseData } from '@lunero/ui';
import type { TrendQueryParams } from '@lunero/api-client';
import { useActiveFlowSheet } from '../../../lib/hooks/use-flow-sheets';
import { useEntries } from '../../../lib/hooks/use-entries';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProfile } from '../../../lib/hooks/use-profile';
import { useTrends } from '../../../lib/hooks/use-trends';

/** Default color palette for pie chart segments. */
const CATEGORY_COLORS = [
  '#E57373', '#81C784', '#64B5F6', '#FFD54F', '#BA68C8',
  '#4DB6AC', '#FF8A65', '#A1887F', '#90A4AE', '#F06292',
];

/** Derive CategoryExpenseData from entries + categories for the pie chart. */
export function buildCategoryExpenseData(
  entries: Array<{ entryType: string; categoryId: string; amount: number; isDeleted: boolean }>,
  categories: Array<{ id: string; name: string; entryType: string }>,
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

export default function AnalyticsPage() {
  const { data: profile } = useProfile();
  const { data: flowSheet, isLoading: sheetLoading, error: sheetError } = useActiveFlowSheet();
  const { data: entries = [], isLoading: entriesLoading } = useEntries(flowSheet?.id ?? '');
  const { data: categories = [] } = useCategories();

  const currency = profile?.defaultCurrency ?? 'USD';

  // Trend params: rolling 6 months for the bar chart
  const trendParams = useMemo<TrendQueryParams>(() => {
    const now = new Date();
    const to = now.toISOString().split('T')[0]!;
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const from = fromDate.toISOString().split('T')[0]!;
    return { view: 'monthly', from, to };
  }, []);

  const { data: trendData, isLoading: trendsLoading, error: trendsError } = useTrends(trendParams);
  const periods = trendData?.periods ?? [];

  // Derive pie chart data from entries + categories
  const categoryExpenseData = useMemo(
    () => buildCategoryExpenseData(entries, categories),
    [entries, categories],
  );

  const isLoading = sheetLoading || entriesLoading || trendsLoading;
  const hasError = sheetError || trendsError;

  if (isLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="status"
        aria-label="Loading analytics"
      >
        <Text fontSize={14} color="$subtleText">Loading analytics…</Text>
      </YStack>
    );
  }

  if (hasError) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="alert"
      >
        <Text fontSize={14} color="$expense">
          Could not load analytics data. Please refresh the page.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={32} maxWidth={860} aria-label="Analytics">
      <Text fontSize={20} fontWeight="500" color="$color">
        Analytics
      </Text>

      <XStack gap={20} flexWrap="wrap" flexDirection="column" $gtMd={{ flexDirection: 'row' }}>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 300 }}>
          <SpendingByCategoryChart data={categoryExpenseData} currency={currency} />
        </YStack>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 300 }}>
          <MonthlyOverviewChart periods={periods} currency={currency} />
        </YStack>
      </XStack>
    </YStack>
  );
}
