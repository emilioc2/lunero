'use client';

import { Text } from '@tamagui/core';
import { YStack, XStack } from './primitives';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export interface CategoryExpenseData {
  categoryName: string;
  amount: number;
  color: string;
}

export interface SpendingByCategoryChartProps {
  data: CategoryExpenseData[];
  currency: string;
}

/** Calculate percentage for a category given total expenses. Returns rounded integer. */
export function calculatePercentage(amount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 100);
}

/** Build legend items with computed percentages. */
export function buildLegendItems(
  data: CategoryExpenseData[],
): Array<{ categoryName: string; percentage: number; color: string }> {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  return data.map((d) => ({
    categoryName: d.categoryName,
    percentage: calculatePercentage(d.amount, total),
    color: d.color,
  }));
}

/** Build the aria-label describing the chart for screen readers. */
export function buildAriaLabel(data: CategoryExpenseData[]): string {
  if (data.length === 0) return 'Spending by category chart with no data';
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const parts = data.map(
    (d) => `${d.categoryName} ${calculatePercentage(d.amount, total)}%`,
  );
  return `Spending by category chart: ${parts.join(', ')}`;
}

const RADIAN = Math.PI / 180;

function renderPercentageLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = props.midAngle ?? 0;
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = props.percent ?? 0;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const pct = Math.round(percent * 100);
  if (pct < 5) return null;
  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${pct}%`}
    </text>
  );
}

export function SpendingByCategoryChart({ data, currency }: SpendingByCategoryChartProps) {
  const legendItems = buildLegendItems(data);
  const ariaLabel = buildAriaLabel(data);
  const isEmpty = data.length === 0;

  return (
    <YStack
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={24}
      gap="$4"
    >
      <Text fontSize={16} fontWeight="500" color="$color">
        Spending by Category
      </Text>

      {isEmpty ? (
        <Text fontSize={14} color="$placeholderColor">
          No expense data yet.
        </Text>
      ) : (
        <>
          <XStack width="100%" height={220} justifyContent="center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart aria-label={ariaLabel}>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  label={renderPercentageLabel}
                  labelLine={false}
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </XStack>

          <YStack gap="$2" role="list" aria-label="Category legend">
            {legendItems.map((item) => (
              <XStack key={item.categoryName} alignItems="center" gap="$2" role="listitem">
                <XStack
                  width={12}
                  height={12}
                  borderRadius={2}
                  backgroundColor={item.color}
                  aria-hidden
                />
                <Text fontSize={13} color="$color">
                  {item.categoryName}
                </Text>
                <Text fontSize={13} color="$placeholderColor">
                  {item.percentage}%
                </Text>
              </XStack>
            ))}
          </YStack>
        </>
      )}
    </YStack>
  );
}
