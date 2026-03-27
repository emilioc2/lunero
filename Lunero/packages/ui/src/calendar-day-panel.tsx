import React from 'react';
import { Text } from '@tamagui/core';
import type { Entry, Category } from '@lunero/core';
import { XStack, YStack } from './primitives';
import { EntryRow } from './entry-row';

export interface CalendarDayPanelProps {
  /** ISO date string for the selected day */
  selectedDate: string;
  entries: Entry[];
  categories: Category[];
  defaultCurrency?: string;
  onAddEntry: (isoDate: string) => void;
  onEditEntry?: (entry: Entry) => void;
  onClose: () => void;
}

// Appending 'T00:00:00' forces local-timezone parsing; without it, Date() treats
// bare ISO date strings as UTC midnight, which shifts the displayed day by one
// in timezones behind UTC (e.g. Americas).
function formatDayHeading(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function CalendarDayPanel({
  selectedDate,
  entries,
  categories,
  defaultCurrency,
  onAddEntry,
  onEditEntry,
  onClose,
}: CalendarDayPanelProps) {
  // Only non-deleted entries whose entryDate exactly matches the selected day are shown.
  // Soft-deleted entries are excluded from the panel (Property 15).
  const dayEntries = entries.filter((e) => !e.isDeleted && e.entryDate === selectedDate);

  // Falls back to 'Unknown' if the category has been deleted or is not yet loaded.
  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Unknown';

  const heading = formatDayHeading(selectedDate);

  return (
    <YStack
      aria-label={`Entries for ${heading}`}
      tag="aside"
      width={320}
      flexShrink={0}
      borderLeftWidth={1}
      borderLeftColor="$borderColor"
      backgroundColor="$surface1"
    >
      {/* Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        padding="$4"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack gap="$1">
          <Text fontSize={15} fontWeight="500" color="$color">
            {heading}
          </Text>
          <Text fontSize={12} color="$placeholderColor">
            {dayEntries.length === 0
              ? 'No entries'
              : `${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}`}
          </Text>
        </YStack>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close day panel"
          style={{
            background: 'none',
            border: 'none',
            fontSize: 16,
            color: '#78716C',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </XStack>

      {/* Entry list */}
      <div
        role="list"
        aria-label={`Entries for ${heading}`}
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {dayEntries.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              fontSize: 13,
              color: '#A8A29E',
            }}
          >
            No entries on this day.
          </div>
        ) : (
          dayEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              id={entry.id}
              amount={entry.amount}
              {...(entry.convertedAmount !== undefined && { convertedAmount: entry.convertedAmount })}
              currency={entry.currency}
              {...(defaultCurrency !== undefined && { defaultCurrency })}
              entryType={entry.entryType}
              categoryName={getCategoryName(entry.categoryId)}
              entryDate={entry.entryDate}
              {...(entry.note !== undefined && { note: entry.note })}
              {...(onEditEntry !== undefined && { onPress: () => onEditEntry(entry) })}
            />
          ))
        )}
      </div>

      {/* Add entry CTA — pre-populates entryDate (task 21.3) */}
      <div style={{ padding: 16, borderTop: '1px solid #E7E5E4' }}>
        <button
          type="button"
          onClick={() => onAddEntry(selectedDate)}
          aria-label={`Add entry for ${heading}`}
          className="cal-panel-add-btn"
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 8,
            border: '1.5px dashed #D6D3D1',
            background: 'transparent',
            color: '#78716C',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          + Add Entry
        </button>
      </div>
    </YStack>
  );
}
