import { Text } from '@tamagui/core';
import type { EntryType } from '@lunero/core';
import { XStack, YStack } from './primitives';
import { CategoryChip } from './category-chip';

export interface EntryRowProps {
  id: string;
  amount: number;
  convertedAmount?: number;
  currency: string;
  defaultCurrency?: string;
  entryType: EntryType;
  categoryName: string;
  entryDate: string; // ISO date string
  note?: string;
  onPress?: (id: string) => void;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Normalise date-only strings to avoid UTC→local day-shift (Requirement 15.3). */
function formatDate(isoDate: string): string {
  const normalized = isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(normalized));
}

export function EntryRow({
  id,
  amount,
  convertedAmount,
  currency,
  defaultCurrency,
  entryType,
  categoryName,
  entryDate,
  note,
  onPress,
}: EntryRowProps) {
  const displayAmount = convertedAmount ?? amount;
  const displayCurrency = defaultCurrency ?? currency;
  const isForeignCurrency = defaultCurrency && currency !== defaultCurrency;

  const typeLabel = entryType === 'income' ? 'Income' : entryType === 'expense' ? 'Expense' : 'Savings';
  const amountLabel = `${typeLabel}: ${formatAmount(displayAmount, displayCurrency)}`;
  // formatDate normalises date-only strings to avoid UTC→local day-shift
  const ariaLabel = `${amountLabel}, category ${categoryName}, date ${formatDate(entryDate)}${note ? `, note: ${note}` : ''}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress?.(id);
    }
  };

  // When onPress is provided, wrap in a focusable div so keyboard users can activate it.
  // Tamagui XStack does not support onKeyDown on web, so we use a native wrapper.
  if (onPress) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={() => onPress(id)}
        onKeyDown={handleKeyDown}
        style={{ cursor: 'pointer', display: 'contents' }}
      >
        <EntryRowInner
          displayAmount={displayAmount}
          displayCurrency={displayCurrency}
          isForeignCurrency={!!isForeignCurrency}
          amount={amount}
          currency={currency}
          entryType={entryType}
          categoryName={categoryName}
          entryDate={entryDate}
          note={note}
          ariaLabel={ariaLabel}
          interactive
        />
      </div>
    );
  }

  return (
    <EntryRowInner
      displayAmount={displayAmount}
      displayCurrency={displayCurrency}
      isForeignCurrency={!!isForeignCurrency}
      amount={amount}
      currency={currency}
      entryType={entryType}
      categoryName={categoryName}
      entryDate={entryDate}
      note={note}
      ariaLabel={ariaLabel}
      interactive={false}
    />
  );
}

interface EntryRowInnerProps {
  displayAmount: number;
  displayCurrency: string;
  isForeignCurrency: boolean;
  amount: number;
  currency: string;
  entryType: EntryType;
  categoryName: string;
  entryDate: string;
  note?: string;
  ariaLabel: string;
  interactive: boolean;
}

function EntryRowInner({
  displayAmount,
  displayCurrency,
  isForeignCurrency,
  amount,
  currency,
  entryType,
  categoryName,
  entryDate,
  note,
  ariaLabel,
  interactive,
}: EntryRowInnerProps) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
      paddingHorizontal="$4"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      gap="$3"
      role="listitem"
      aria-label={ariaLabel}
      cursor={interactive ? 'pointer' : undefined}
      hoverStyle={interactive ? { backgroundColor: '$backgroundHover' } : undefined}
      focusStyle={interactive ? { backgroundColor: '$backgroundFocus' } : undefined}
    >
      {/* Left: category chip + date */}
      <YStack gap="$1" flex={1} minWidth={0}>
        <CategoryChip name={categoryName} entryType={entryType} />
        <Text fontSize={12} color="$placeholderColor" aria-hidden={true}>
          {formatDate(entryDate)}
        </Text>
        {note ? (
          <Text
            fontSize={12}
            color="$colorHover"
            numberOfLines={1}
            ellipsizeMode="tail"
            aria-hidden={true}
          >
            {note}
          </Text>
        ) : null}
      </YStack>

      {/* Right: amount */}
      <YStack alignItems="flex-end" gap="$1">
        <Text
          fontSize={16}
          fontWeight="500"
          color={
            entryType === 'income'
              ? '$income'
              : entryType === 'expense'
                ? '$expense'
                : '$savings'
          }
          aria-hidden={true}
        >
          {entryType === 'income' ? '+' : '\u2212'}{formatAmount(displayAmount, displayCurrency)}
        </Text>
        {isForeignCurrency ? (
          <Text fontSize={11} color="$placeholderColor" aria-hidden={true}>
            {formatAmount(amount, currency)}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
