import React from 'react';
import { Text } from '@tamagui/core';
import type { EntryType } from '@lunero/core';
import { XStack, YStack } from './primitives';
import { COLOR } from './tokens';

export interface TransactionRowProps {
  id: string;
  note: string;
  amount: number;
  currency: string;
  entryType: EntryType;
  categoryName: string;
  entryDate: string;
  onDelete?: (id: string) => void;
  /** Row index for alternating background */
  index?: number;
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
    year: 'numeric',
  }).format(new Date(normalized));
}

export function TransactionRow({
  id,
  note,
  amount,
  currency,
  entryType,
  categoryName,
  entryDate,
  onDelete,
  index = 0,
}: TransactionRowProps) {
  const prefix = entryType === 'income' ? '+' : '\u2212';
  const amountColor =
    entryType === 'income'
      ? COLOR.positiveGreen
      : entryType === 'expense'
        ? COLOR.expenseClayRed
        : COLOR.savingsWarmEarth;

  const circleColor = dotColor(entryType);

  const typeLabel =
    entryType === 'income' ? 'Income' : entryType === 'expense' ? 'Expense' : 'Savings';
  const ariaLabel = `${typeLabel}: ${prefix}${formatAmount(amount, currency)}, ${note}, category ${categoryName}, ${formatDate(entryDate)}`;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDelete?.(id);
    }
  };

  return (
    <XStack
      alignItems="center"
      padding={16}
      gap={14}
      role="listitem"
      aria-label={ariaLabel}
      className="transaction-row"
      backgroundColor="$surface1"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      hoverStyle={{ scale: 1.005, backgroundColor: '$backgroundHover' }}
    >
      {/* Colored circle icon */}
      <XStack
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor={`${circleColor}18` as any}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        aria-hidden="true"
      >
        <XStack
          width={12}
          height={12}
          borderRadius={6}
          backgroundColor={circleColor as any}
        />
      </XStack>

      {/* Name + category (top) and date (bottom) */}
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
            {note}
          </Text>
          <Text
            fontSize={12}
            fontWeight="500"
            color={amountColor as any}
            aria-hidden="true"
          >
            {categoryName}
          </Text>
        </XStack>
        <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
          {formatDate(entryDate)}
        </Text>
      </YStack>

      {/* Amount */}
      <Text
        fontSize={15}
        fontWeight="600"
        color={amountColor as any}
        flexShrink={0}
        aria-hidden="true"
      >
        {prefix}{formatAmount(amount, currency)}
      </Text>

      {/* Delete / settings icon */}
      {onDelete ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Delete ${note}`}
          onClick={handleDeleteClick}
          onKeyDown={handleDeleteKeyDown}
          className="transaction-delete-btn"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.4,
            transition: 'opacity 0.15s ease',
          }}
        >
          <Text fontSize={18} fontWeight="700" color="$placeholderColor" aria-hidden="true">⋮</Text>
        </div>
      ) : null}
    </XStack>
  );
}
