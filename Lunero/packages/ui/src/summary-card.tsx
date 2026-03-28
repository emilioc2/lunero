import { Text } from '@tamagui/core';
import { XStack, YStack } from './primitives';

export interface SummaryCardProps {
  label: 'Income' | 'Expenses' | 'Savings';
  amount: number;
  currency: string;
  /** Optional subtitle, e.g. "8.1% of Income" for savings */
  subtitle?: string;
  /** Icon indicator: ↑ income, ↓ expenses, ◎ savings */
  icon: '↑' | '↓' | '◎';
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function SummaryCard({ label, amount, currency, subtitle, icon }: SummaryCardProps) {
  return (
    <YStack
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={20}
      gap="$1"
      role="region"
      aria-label={`${label}: ${formatAmount(amount, currency)}${subtitle ? `, ${subtitle}` : ''}`}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      hoverStyle={{ scale: 1.02 }}
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <Text
          fontSize={11}
          fontWeight="500"
          letterSpacing={1.2}
          textTransform="uppercase"
          color="$placeholderColor"
          aria-hidden="true"
        >
          {label}
        </Text>
        <Text fontSize={14} color="$placeholderColor" aria-hidden="true">
          {icon}
        </Text>
      </XStack>

      <Text
        fontSize={22}
        fontWeight="300"
        color="$color"
        aria-hidden="true"
      >
        {formatAmount(amount, currency)}
      </Text>

      {subtitle ? (
        <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
          {subtitle}
        </Text>
      ) : null}
    </YStack>
  );
}
