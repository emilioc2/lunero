import { Text } from '@tamagui/core';
import type { EntryType } from '@lunero/core';
import { XStack, YStack } from './primitives';
import { COLOR, TYPOGRAPHY } from './tokens';

export interface RecentTransactionItem {
  id: string;
  note: string;
  amount: number;
  entryType: EntryType;
  categoryName: string;
  /** ISO date string */
  entryDate: string;
}

export interface RecentTransactionsListProps {
  entries: RecentTransactionItem[];
  currency: string;
}

function dotColor(entryType: EntryType): string {
  switch (entryType) {
    case 'income':
      return COLOR.positiveGreen;
    case 'expense':
      return COLOR.expenseClayRed;
    case 'savings':
      return COLOR.savingsWarmEarth;
  }
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  const normalized = isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(normalized));
}

export function RecentTransactionsList({ entries, currency }: RecentTransactionsListProps) {
  const recent = entries.slice(0, 5);

  return (
    <YStack
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={20}
      gap="$3"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <Text
        fontSize={TYPOGRAPHY.sectionHeading.fontSize}
        fontWeight={TYPOGRAPHY.sectionHeading.fontWeight}
        color="$color"
      >
        Recent Transactions
      </Text>

      {recent.length === 0 ? (
        <Text fontSize={14} color="$placeholderColor">
          No transactions yet.
        </Text>
      ) : (
        <YStack role="list" gap={10}>
          {recent.map((entry) => {
            const prefix = entry.entryType === 'income' ? '+' : '\u2212';
            const amountColor =
              entry.entryType === 'income'
                ? COLOR.positiveGreen
                : entry.entryType === 'expense'
                  ? COLOR.expenseClayRed
                  : COLOR.savingsWarmEarth;

            const circleColor = dotColor(entry.entryType);

            return (
              <XStack
                key={entry.id}
                alignItems="center"
                padding={14}
                gap={12}
                role="listitem"
                aria-label={`${entry.note}, ${prefix}${formatAmount(entry.amount, currency)}`}
                backgroundColor="$surface1"
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius={10}
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              >
                {/* Colored circle icon */}
                <XStack
                  width={36}
                  height={36}
                  borderRadius={18}
                  backgroundColor={`${circleColor}18` as any}
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                  aria-hidden="true"
                >
                  <XStack
                    width={10}
                    height={10}
                    borderRadius={5}
                    backgroundColor={circleColor as any}
                  />
                </XStack>

                {/* Name + category / date */}
                <YStack flex={1} gap={2}>
                  <XStack alignItems="center" gap={8}>
                    <Text
                      fontSize={14}
                      fontWeight="500"
                      color="$color"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      aria-hidden="true"
                    >
                      {entry.note}
                    </Text>
                    <Text
                      fontSize={12}
                      fontWeight="500"
                      color={amountColor as any}
                      aria-hidden="true"
                    >
                      {entry.categoryName}
                    </Text>
                  </XStack>
                  <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
                    {formatDate(entry.entryDate)}
                  </Text>
                </YStack>

                {/* Signed amount */}
                <Text
                  fontSize={15}
                  fontWeight="600"
                  color={amountColor as any}
                  flexShrink={0}
                  aria-hidden="true"
                >
                  {prefix}{formatAmount(entry.amount, currency)}
                </Text>
              </XStack>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
}
