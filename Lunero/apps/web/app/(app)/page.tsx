'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Text } from '@tamagui/core';
import { YStack, XStack } from '@lunero/ui';
import {
  SummaryCard,
  ActiveFlowSheetCard,
  MonthlyOverviewChart,
  RecentTransactionsList,
} from '@lunero/ui';
import type { RecentTransactionItem } from '@lunero/ui';
import type { Entry } from '@lunero/core';
import { useActiveFlowSheet } from '../../lib/hooks/use-flow-sheets';
import { useEntries } from '../../lib/hooks/use-entries';
import { useCategories } from '../../lib/hooks/use-categories';
import { useProfile } from '../../lib/hooks/use-profile';
import { useProjectionSummary } from '../../lib/hooks/use-projections';
import { useTrends } from '../../lib/hooks/use-trends';
import { useEntryStore } from '../../lib/store/entry-store';
import { formatCurrency } from '../../lib/locale-utils';

export default function OverviewPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: flowSheet, isLoading: sheetLoading, error: sheetError } = useActiveFlowSheet();
  const { data: serverEntries = [], isLoading: entriesLoading } = useEntries(flowSheet?.id ?? '');
  const { data: categories = [] } = useCategories();
  const { data: projectionSummary } = useProjectionSummary(flowSheet?.id ?? '');
  const { data: trendData } = useTrends({ view: 'monthly' });

  const { entriesBySheet } = useEntryStore();
  const storeEntries: Entry[] = flowSheet
    ? (entriesBySheet[flowSheet.id] ?? serverEntries)
    : serverEntries;

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';

  const savingsPercent = useMemo(() => {
    if (!flowSheet || flowSheet.totalIncome === 0) return '0% of Income';
    const pct = ((flowSheet.totalSavings / flowSheet.totalIncome) * 100).toFixed(1);
    return `${pct}% of Income`;
  }, [flowSheet]);

  const recentTransactions: RecentTransactionItem[] = useMemo(() => {
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    return [...storeEntries]
      .filter((e) => !e.isDeleted)
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        note: e.note || 'Untitled',
        amount: e.amount,
        entryType: e.entryType,
        categoryName: categoryMap.get(e.categoryId) ?? 'Uncategorized',
        entryDate: e.entryDate,
      }));
  }, [storeEntries, categories]);

  // Rolling 6-month chart data
  const chartPeriods = useMemo(() => {
    if (!trendData?.periods) return [];
    return trendData.periods.slice(-6);
  }, [trendData]);

  // Projection data for ActiveFlowSheetCard
  const projByType = projectionSummary?.byEntryType;
  const incomeProjected = projByType?.income?.projected ?? 0;
  const expenseProjected = projByType?.expense?.projected ?? 0;
  const projectedBalance = (projectionSummary?.overall?.projected ?? 0);

  // Loading state
  if (sheetLoading || entriesLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="status"
        aria-label="Loading overview"
      >
        <Text fontSize={14} color="$subtleText">Loading your FlowSheet…</Text>
      </YStack>
    );
  }

  // Error state
  if (sheetError) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="alert"
      >
        <Text fontSize={14} color="$expense">
          Could not load your active FlowSheet. Please refresh the page.
        </Text>
      </YStack>
    );
  }

  // No active FlowSheet state
  if (!flowSheet) {
    return (
      <YStack gap={32} aria-label="Overview">
        <Text fontSize={20} fontWeight="500" color="$color">Overview</Text>
        <YStack
          backgroundColor="$surface1"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={12}
          padding={28}
          alignItems="center"
          gap="$3"
        >
          <Text fontSize={15} fontWeight="500" color="$color">
            No active FlowSheet
          </Text>
          <Text fontSize={14} color="$placeholderColor" textAlign="center">
            Create a new FlowSheet to start tracking your budget.
          </Text>
          <Text
            fontSize={14}
            fontWeight="500"
            color="#FAFAF9"
            backgroundColor="#C86D5A"
            paddingHorizontal={18}
            paddingVertical={8}
            borderRadius={8}
            cursor="pointer"
            role="button"
            tabIndex={0}
            onPress={() => router.push('/flowsheets')}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push('/flowsheets');
              }
            }}
          >
            + Create FlowSheet
          </Text>
        </YStack>
      </YStack>
    );
  }

  const isPositive = flowSheet.availableBalance >= 0;

  return (
    <YStack gap={32} aria-label="Overview">
      {/* Balance Section */}
      <YStack
        backgroundColor="$surface1"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius={12}
        padding={24}
        gap="$2"
        role="region"
        aria-label={`Current Balance: ${formatCurrency(flowSheet.availableBalance, defaultCurrency)}`}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderLeft: `3px solid ${isPositive ? '#22C55E' : '#C86D5A'}`,
        }}
      >
        <Text
          fontSize={12}
          fontWeight="500"
          letterSpacing={1.2}
          textTransform="uppercase"
          color="$placeholderColor"
        >
          Current Balance
        </Text>
        <XStack alignItems="center" gap="$3">
          <Text fontSize={34} fontWeight="300" color="$color">
            {formatCurrency(flowSheet.availableBalance, defaultCurrency)}
          </Text>
          <XStack
            backgroundColor={isPositive ? '$positiveBgGreen' : '#FDF2F0'}
            borderRadius={99}
            paddingHorizontal={14}
            paddingVertical={5}
            gap="$1"
            alignItems="center"
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color={isPositive ? '$positiveTextGreen' : '#C86D5A'}
            >
              {isPositive ? '↑' : '↓'}
            </Text>
            <Text
              fontSize={13}
              fontWeight="500"
              color={isPositive ? '$positiveTextGreen' : '#C86D5A'}
            >
              {isPositive ? 'Positive' : 'Negative'}
            </Text>
          </XStack>
        </XStack>
      </YStack>

      {/* Summary Cards Row */}
      <XStack gap={12} flexWrap="wrap" flexDirection="column" $gtMd={{ flexDirection: 'row', gap: 16 }} role="region" aria-label="Financial summary">
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 180 }}>
          <SummaryCard
            label="Income"
            amount={flowSheet.totalIncome}
            currency={defaultCurrency}
            icon="↑"
          />
        </YStack>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 180 }}>
          <SummaryCard
            label="Expenses"
            amount={flowSheet.totalExpenses}
            currency={defaultCurrency}
            icon="↓"
          />
        </YStack>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 180 }}>
          <SummaryCard
            label="Savings"
            amount={flowSheet.totalSavings}
            currency={defaultCurrency}
            subtitle={savingsPercent}
            icon="◎"
          />
        </YStack>
      </XStack>

      {/* Active FlowSheet Card */}
      <ActiveFlowSheetCard
        name={flowSheet.id ? `${flowSheet.periodType.charAt(0).toUpperCase() + flowSheet.periodType.slice(1)} Budget` : 'Budget'}
        periodType={flowSheet.periodType.charAt(0).toUpperCase() + flowSheet.periodType.slice(1)}
        startDate={flowSheet.startDate}
        endDate={flowSheet.endDate}
        incomeActual={flowSheet.totalIncome}
        incomeProjected={incomeProjected}
        expenseActual={flowSheet.totalExpenses}
        expenseProjected={expenseProjected}
        projectedBalance={projectedBalance}
        currency={defaultCurrency}
        onViewDetails={() => router.push(`/flowsheets/${flowSheet.id}`)}
      />

      {/* Monthly Overview Chart */}
      {chartPeriods.length > 0 && (
        <MonthlyOverviewChart periods={chartPeriods} currency={defaultCurrency} />
      )}

      {/* Recent Transactions */}
      <RecentTransactionsList entries={recentTransactions} currency={defaultCurrency} />
    </YStack>
  );
}
