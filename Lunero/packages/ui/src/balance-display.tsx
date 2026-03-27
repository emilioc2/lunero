import { Text } from '@tamagui/core';
import { YStack, XStack } from './primitives';

export interface BalanceDisplayProps {
  availableBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  currency?: string;
}

function formatAmount(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function BalanceDisplay({
  availableBalance,
  totalIncome,
  totalExpenses,
  totalSavings,
  currency = 'USD',
}: BalanceDisplayProps) {
  const isOverspent = availableBalance < 0;

  return (
    <YStack
      gap="$4"
      aria-label="Available balance summary"
      role="region"
    >
      {/* Primary balance figure */}
      <YStack gap="$1">
        <Text
          fontSize={12}
          letterSpacing={1.5}
          textTransform="uppercase"
          color="$placeholderColor"
          aria-hidden="true"
        >
          Available Balance
        </Text>
        <Text
          fontSize={40}
          fontWeight="300"
          color={isOverspent ? '$expense' : '$color'}
          aria-label={`Available balance: ${formatAmount(availableBalance, currency)}`}
        >
          {formatAmount(availableBalance, currency)}
        </Text>
      </YStack>

      {/* Breakdown row */}
      <XStack gap="$6" flexWrap="wrap" role="list" aria-label="Balance breakdown">
        <BreakdownItem
          label="Income"
          amount={totalIncome}
          currency={currency}
          color="$income"
        />
        <BreakdownItem
          label="Expenses"
          amount={totalExpenses}
          currency={currency}
          color="$expense"
        />
        <BreakdownItem
          label="Savings"
          amount={totalSavings}
          currency={currency}
          color="$savings"
        />
      </XStack>
    </YStack>
  );
}

interface BreakdownItemProps {
  label: string;
  amount: number;
  currency: string;
  color: string;
}

function BreakdownItem({ label, amount, currency, color }: BreakdownItemProps) {
  return (
    <YStack gap="$1" role="listitem">
      <Text
        fontSize={11}
        letterSpacing={1}
        textTransform="uppercase"
        color="$placeholderColor"
        aria-hidden="true"
      >
        {label}
      </Text>
      <Text
        fontSize={16}
        fontWeight="500"
        color={color as any}
        aria-label={`${label}: ${formatAmount(amount, currency)}`}
      >
        {formatAmount(amount, currency)}
      </Text>
    </YStack>
  );
}
