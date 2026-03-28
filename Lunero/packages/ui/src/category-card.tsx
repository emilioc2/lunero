import { Text } from '@tamagui/core';
import { XStack, YStack } from './primitives';
import { COLOR, PROGRESS_BAR } from './tokens';

export interface CategoryCardProps {
  name: string;
  type: 'income' | 'expense';
  projectedAmount: number;
  actualAmount: number;
  currency: string;
  isEditable?: boolean;
  onEdit?: () => void;
}

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

/**
 * Computes the difference between actual and projected, and determines
 * the display color and prefix based on category type.
 *
 * For income: surplus (actual > projected) is positive green with "+" prefix.
 * For expense: overspend (actual > projected) is Clay Red.
 */
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

  // Expense: overspend is Clay Red, under-budget is green
  if (diff > 0) {
    return { text: `+${formatAmount(diff, currency)}`, color: COLOR.expenseClayRed };
  }
  if (diff < 0) {
    return { text: formatAmount(diff, currency), color: COLOR.positiveGreen };
  }
  return { text: formatAmount(0, currency), color: COLOR.stone400 };
}

export function CategoryCard({
  name,
  type,
  projectedAmount,
  actualAmount,
  currency,
  isEditable = false,
  onEdit,
}: CategoryCardProps) {
  const percent = clampPercent(actualAmount, projectedAmount);
  const fillColor = type === 'income' ? PROGRESS_BAR.incomeFill : PROGRESS_BAR.expenseFill;
  const subtitle = type === 'income' ? 'Income Source' : 'Expense Category';
  const difference = computeDifference(type, actualAmount, projectedAmount, currency);

  return (
    <YStack
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={20}
      gap="$3"
      role="region"
      aria-label={`${name}: actual ${formatAmount(actualAmount, currency)} of ${formatAmount(projectedAmount, currency)} projected`}
    >
      {/* Header: category name + edit icon */}
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$1" flex={1}>
          <Text fontSize={15} fontWeight="500" color="$color">
            {name}
          </Text>
          <Text fontSize={12} color="$placeholderColor">
            {subtitle}
          </Text>
        </YStack>
        {isEditable && (
          <Text
            fontSize={14}
            color="$placeholderColor"
            cursor="pointer"
            role="button"
            tabIndex={0}
            aria-label={`Edit ${name}`}
            onPress={onEdit}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit?.();
              }
            }}
            hoverStyle={{ color: '$color' as any }}
          >
            ✏️
          </Text>
        )}
      </XStack>

      {/* Projected amount */}
      <Text fontSize={13} color="$placeholderColor">
        Projected: {formatAmount(projectedAmount, currency)}
      </Text>

      {/* Actual amount */}
      <Text
        fontSize={14}
        fontWeight="500"
        color={
          type === 'expense' && actualAmount > projectedAmount
            ? (COLOR.expenseClayRed as any)
            : ('$color' as any)
        }
      >
        Actual: {formatAmount(actualAmount, currency)}
      </Text>

      {/* Progress bar */}
      <XStack
        height={PROGRESS_BAR.height}
        borderRadius={PROGRESS_BAR.borderRadius}
        backgroundColor="$surface3"
        overflow="hidden"
        role="meter"
        aria-label={`${name} progress`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <XStack
          height="100%"
          borderRadius={PROGRESS_BAR.borderRadius}
          backgroundColor={fillColor as any}
          width={`${percent}%` as any}
        />
      </XStack>

      {/* Difference value */}
      <Text
        fontSize={13}
        fontWeight="500"
        color={difference.color as any}
      >
        {difference.text}
      </Text>
    </YStack>
  );
}
