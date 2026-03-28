'use client';

import { Text } from '@tamagui/core';
import { YStack, XStack } from './primitives';
import type { TrendPeriod } from './trend-chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface MonthlyOverviewChartProps {
  /** Rolling 6-month data from useTrends hook */
  periods: TrendPeriod[];
  currency: string;
}

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

interface ChartDataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

function buildChartData(periods: TrendPeriod[]): ChartDataPoint[] {
  return periods.map((p) => ({
    month: getMonthAbbreviation(p.startDate, p.label),
    income: p.totalIncome,
    expenses: p.totalExpenses,
    savings: p.totalSavings,
  }));
}

export function MonthlyOverviewChart({ periods, currency }: MonthlyOverviewChartProps) {
  const data = buildChartData(periods);

  return (
    <YStack
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={24}
      gap="$4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <Text
        fontSize={16}
        fontWeight="500"
        color="$color"
      >
        Monthly Overview
      </Text>

      {/* Legend */}
      <XStack gap="$5" flexWrap="wrap" role="list" aria-label="Chart legend">
        {LEGEND_ITEMS.map((item) => (
          <XStack key={item.key} alignItems="center" gap="$1" role="listitem">
            <XStack
              width={10}
              height={10}
              borderRadius={5}
              backgroundColor={item.color}
              aria-hidden
            />
            <Text fontSize={12} color="$placeholderColor">
              {item.label}
            </Text>
          </XStack>
        ))}
      </XStack>

      {/* Chart */}
      <XStack width="100%" height={220}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            aria-label={`Monthly overview bar chart showing income, expenses, and savings for ${data.length} months`}
          >
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'var(--placeholderColor, #A8A29E)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--placeholderColor, #A8A29E)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCompactCurrency(value, currency)}
              width={60}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCompactCurrency(Number(value), currency),
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--borderColor, #E7E5E4)',
                fontSize: 13,
                backgroundColor: 'var(--surface1, #FFFFFF)',
                color: 'var(--color, #1C1917)',
              }}
            />
            <Bar dataKey="income" fill={BAR_COLORS.income} radius={[3, 3, 0, 0]} barSize={16} name="Income" />
            <Bar dataKey="expenses" fill={BAR_COLORS.expenses} radius={[3, 3, 0, 0]} barSize={16} name="Expenses" />
            <Bar dataKey="savings" fill={BAR_COLORS.savings} radius={[3, 3, 0, 0]} barSize={16} name="Savings" />
          </BarChart>
        </ResponsiveContainer>
      </XStack>
    </YStack>
  );
}
