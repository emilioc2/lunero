import { Text } from '@tamagui/core';
import { XStack, YStack } from './primitives';
import { BADGE, PROGRESS_BAR } from './tokens';

export interface ActiveFlowSheetCardProps {
  name: string;
  periodType: string;
  startDate: string;
  endDate: string;
  incomeActual: number;
  incomeProjected: number;
  expenseActual: number;
  expenseProjected: number;
  projectedBalance: number;
  currency: string;
  onViewDetails: () => void;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const s = startDate.length === 10 ? `${startDate}T00:00:00` : startDate;
  const e = endDate.length === 10 ? `${endDate}T00:00:00` : endDate;
  return `${fmt.format(new Date(s))} \u2013 ${fmt.format(new Date(e))}`;
}

function clampPercent(actual: number, projected: number): number {
  if (projected <= 0) return 0;
  return Math.round(Math.min(actual / projected, 1) * 100);
}

interface ProgressRowProps {
  label: string;
  actual: number;
  projected: number;
  currency: string;
  fillColor: string;
}

function ProgressRow({ label, actual, projected, currency, fillColor }: ProgressRowProps) {
  const percent = clampPercent(actual, projected);
  const statusLabel = projected > 0
    ? actual > projected ? 'over budget' : actual === projected ? 'at budget' : 'under budget'
    : 'no projection';

  return (
    <YStack
      gap="$1"
      role="meter"
      aria-label={`${label}: ${formatAmount(actual, currency)} of ${formatAmount(projected, currency)} projected — ${statusLabel}`}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} fontWeight="500" color="$color" aria-hidden="true">
          {label}
        </Text>
        <XStack gap="$1" alignItems="center">
          <Text fontSize={12} fontWeight="500" color={fillColor as any} aria-hidden="true">
            {formatAmount(actual, currency)}
          </Text>
          <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
            {' / '}
          </Text>
          <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
            {formatAmount(projected, currency)}
          </Text>
        </XStack>
      </XStack>
      <XStack
        height={PROGRESS_BAR.height}
        borderRadius={PROGRESS_BAR.borderRadius}
        backgroundColor="$surface3"
        overflow="hidden"
        aria-hidden="true"
      >
        <XStack
          height="100%"
          borderRadius={PROGRESS_BAR.borderRadius}
          backgroundColor={fillColor as any}
          width={`${percent}%` as any}
        />
      </XStack>
    </YStack>
  );
}

export function ActiveFlowSheetCard({
  name,
  periodType,
  startDate,
  endDate,
  incomeActual,
  incomeProjected,
  expenseActual,
  expenseProjected,
  projectedBalance,
  currency,
  onViewDetails,
}: ActiveFlowSheetCardProps) {
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <YStack
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={24}
      gap="$4"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      hoverStyle={{ scale: 1.01 }}
      role="region"
      aria-label={`Active FlowSheet: ${name}`}
    >
      {/* Header: name + Active badge + period type */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2" alignItems="center">
          <Text fontSize={15} fontWeight="500" color="$color">
            {name}
          </Text>
          <XStack
            backgroundColor="$positiveBgGreen"
            borderRadius={BADGE.borderRadius}
            paddingHorizontal={BADGE.paddingHorizontal}
            paddingVertical={BADGE.paddingVertical}
          >
            <Text
              fontSize={BADGE.fontSize}
              fontWeight={BADGE.fontWeight}
              color="$positiveTextGreen"
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              Active
            </Text>
          </XStack>
        </XStack>
        <Text fontSize={13} color="$placeholderColor">
          {periodType}
        </Text>
      </XStack>

      {/* Date range */}
      <Text fontSize={13} color="$placeholderColor">
        {dateRange}
      </Text>

      {/* Progress bars */}
      <YStack gap="$3">
        <ProgressRow
          label="Income"
          actual={incomeActual}
          projected={incomeProjected}
          currency={currency}
          fillColor={PROGRESS_BAR.incomeFill}
        />
        <ProgressRow
          label="Expenses"
          actual={expenseActual}
          projected={expenseProjected}
          currency={currency}
          fillColor={PROGRESS_BAR.expenseFill}
        />
      </YStack>

      {/* Projected balance + View Details link */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={14} color="$color">
          Projected Balance: {formatAmount(projectedBalance, currency)}
        </Text>
        <Text
          fontSize={13}
          fontWeight="500"
          color="$color"
          cursor="pointer"
          role="link"
          tabIndex={0}
          onPress={onViewDetails}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onViewDetails();
            }
          }}
          hoverStyle={{ textDecorationLine: 'underline' }}
        >
          View Details →
        </Text>
      </XStack>
    </YStack>
  );
}
