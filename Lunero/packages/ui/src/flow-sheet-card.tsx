import { Text } from '@tamagui/core';
import type { FlowSheet } from '@lunero/core';
import { XStack, YStack } from './primitives';

export interface FlowSheetCardProps {
  flowSheet: FlowSheet;
  currency?: string;
  onPress?: (id: string) => void;
}

function formatAmount(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPeriodLabel(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  // Normalise date-only strings to avoid UTC→local day-shift (Requirement 15.3)
  const s = startDate.length === 10 ? `${startDate}T00:00:00` : startDate;
  const e = endDate.length === 10 ? `${endDate}T00:00:00` : endDate;
  return `${fmt.format(new Date(s))} \u2013 ${fmt.format(new Date(e))}`;
}

export function FlowSheetCard({ flowSheet, currency = 'USD', onPress }: FlowSheetCardProps) {
  const isOverspent = flowSheet.availableBalance < 0;
  const periodLabel = formatPeriodLabel(flowSheet.startDate, flowSheet.endDate);
  const isArchived = flowSheet.status === 'archived';

  return (
    <YStack
      backgroundColor="$surface1"
      borderRadius="$3"
      padding="$5"
      gap="$4"
      borderWidth={1}
      borderColor="$borderColor"
      role="article"
      aria-label={`FlowSheet: ${periodLabel}${isArchived ? ', archived' : ', active'}`}
      onPress={onPress ? () => onPress(flowSheet.id) : undefined}
      cursor={onPress ? 'pointer' : undefined}
      hoverStyle={onPress ? { backgroundColor: '$backgroundHover' } : undefined}
      focusStyle={onPress ? { backgroundColor: '$backgroundFocus' } : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={
        onPress
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPress(flowSheet.id);
              }
            }
          : undefined
      }
    >
      {/* Header: period label + status badge */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} color="$placeholderColor" letterSpacing={0.5}>
          {periodLabel}
        </Text>
        {isArchived && (
          <XStack
            backgroundColor="$surface2"
            borderRadius="$full"
            paddingHorizontal="$2"
            paddingVertical="$1"
            aria-label="Archived"
          >
            <Text fontSize={11} color="$placeholderColor" textTransform="uppercase" letterSpacing={1}>
              Archived
            </Text>
          </XStack>
        )}
      </XStack>

      {/* Available balance */}
      <YStack gap="$1">
        <Text fontSize={11} color="$placeholderColor" textTransform="uppercase" letterSpacing={1.5} aria-hidden="true">
          Available Balance
        </Text>
        <Text
          fontSize={28}
          fontWeight="300"
          color={isOverspent ? '$expense' : '$color'}
          aria-label={`Available balance: ${formatAmount(flowSheet.availableBalance, currency)}`}
        >
          {formatAmount(flowSheet.availableBalance, currency)}
        </Text>
      </YStack>

      {/* Totals row */}
      <XStack gap="$5" flexWrap="wrap" role="list" aria-label="Totals">
        <TotalItem label="Income" amount={flowSheet.totalIncome} currency={currency} color="$income" />
        <TotalItem label="Expenses" amount={flowSheet.totalExpenses} currency={currency} color="$expense" />
        <TotalItem label="Savings" amount={flowSheet.totalSavings} currency={currency} color="$savings" />
      </XStack>
    </YStack>
  );
}

interface TotalItemProps {
  label: string;
  amount: number;
  currency: string;
  color: string;
}

function TotalItem({ label, amount, currency, color }: TotalItemProps) {
  return (
    <YStack gap="$1" role="listitem">
      <Text fontSize={11} color="$placeholderColor" textTransform="uppercase" letterSpacing={1} aria-hidden="true">
        {label}
      </Text>
      <Text
        fontSize={14}
        fontWeight="500"
        color={color as any}
        aria-label={`${label}: ${formatAmount(amount, currency)}`}
      >
        {formatAmount(amount, currency)}
      </Text>
    </YStack>
  );
}
