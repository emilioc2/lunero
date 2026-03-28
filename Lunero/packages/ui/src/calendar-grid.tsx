import React, { useMemo, useRef, useCallback } from 'react';
import type { Entry, EntryType } from '@lunero/core';
import { XStack, YStack } from './primitives';

export interface CalendarGridProps {
  startDate: string;
  endDate: string;
  entries: Entry[];
  displayMonth: number;
  displayYear: number;
  selectedDate?: string;
  onDaySelect: (isoDate: string) => void;
}

const DOT_COLORS: Record<'income' | 'expense', string> = {
  income: '#22C55E',
  expense: '#C86D5A',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns which entry types are present on a given day.
 * Used to render individual colored dots per type (Req 17.5, 17.6, 17.7).
 */
function entryTypesPresent(dayEntries: Entry[]): Set<EntryType> {
  const types = new Set<EntryType>();
  for (const e of dayEntries) {
    types.add(e.entryType);
  }
  return types;
}

export function CalendarGrid({
  startDate,
  endDate,
  entries,
  displayMonth,
  displayYear,
  selectedDate,
  onDaySelect,
}: CalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const entriesByDate = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of entries) {
      if (e.isDeleted) continue;
      if (!map[e.entryDate]) map[e.entryDate] = [];
      map[e.entryDate]!.push(e);
    }
    return map;
  }, [entries]);

  const { cells, monthLabel } = useMemo(() => {
    const firstOfMonth = new Date(displayYear, displayMonth, 1);
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    const startPad = firstOfMonth.getDay();

    const label = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const grid: (number | null)[] = [
      ...Array(startPad).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (grid.length % 7 !== 0) grid.push(null);

    return { cells: grid, monthLabel: label };
  }, [displayMonth, displayYear]);

  const periodStart = startDate.slice(0, 10);
  const periodEnd = endDate.slice(0, 10);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return;

    const focusable = Array.from(
      grid.querySelectorAll<HTMLElement>('[role="gridcell"][tabindex="0"]'),
    );
    const current = document.activeElement as HTMLElement;
    const currentIdx = focusable.indexOf(current);
    if (currentIdx === -1) return;

    let nextIdx: number | null = null;

    if (e.key === 'ArrowRight') nextIdx = currentIdx + 1;
    else if (e.key === 'ArrowLeft') nextIdx = currentIdx - 1;
    else if (e.key === 'ArrowDown') nextIdx = currentIdx + 7;
    else if (e.key === 'ArrowUp') nextIdx = currentIdx - 7;
    else return;

    e.preventDefault();

    if (nextIdx !== null && nextIdx >= 0 && nextIdx < focusable.length) {
      focusable[nextIdx]?.focus();
    }
  }, []);

  return (
    <YStack gap="$3" aria-label="Calendar">
      {/* Day-of-week header */}
      <XStack>
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--placeholderColor, #78716C)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              paddingBottom: 8,
            }}
            aria-hidden="true"
          >
            {d}
          </div>
        ))}
      </XStack>

      {/* Day cells grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`Calendar for ${monthLabel}`}
        onKeyDown={handleGridKeyDown}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}
      >
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} role="gridcell" aria-hidden="true" />;
          }

          const isoDate = toIsoDate(new Date(displayYear, displayMonth, day));
          const isInPeriod = isoDate >= periodStart && isoDate <= periodEnd;
          const dayEntries = entriesByDate[isoDate] ?? [];
          const types = entryTypesPresent(dayEntries);
          const isSelected = isoDate === selectedDate;
          const isToday = isoDate === toIsoDate(new Date());

          return (
            <DayCell
              key={isoDate}
              day={day}
              isoDate={isoDate}
              isInPeriod={isInPeriod}
              isSelected={isSelected}
              isToday={isToday}
              hasIncome={types.has('income')}
              hasExpense={types.has('expense')}
              entryCount={dayEntries.length}
              onSelect={onDaySelect}
            />
          );
        })}
      </div>
    </YStack>
  );
}

// ── DayCell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: number;
  isoDate: string;
  isInPeriod: boolean;
  isSelected: boolean;
  isToday: boolean;
  hasIncome: boolean;
  hasExpense: boolean;
  entryCount: number;
  onSelect: (isoDate: string) => void;
}

function DayCell({
  day,
  isoDate,
  isInPeriod,
  isSelected,
  isToday,
  hasIncome,
  hasExpense,
  entryCount,
  onSelect,
}: DayCellProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isInPeriod) onSelect(isoDate);
    }
  };

  const ariaLabel = [
    new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    entryCount > 0 ? `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}` : 'no entries',
    !isInPeriod ? '(outside period)' : '',
  ]
    .filter(Boolean)
    .join(', ');

  // Today uses #6366F1 background (Req 17.8)
  const todayBg = '#6366F1';

  return (
    <div
      role="gridcell"
      tabIndex={isInPeriod ? 0 : -1}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-disabled={!isInPeriod}
      onClick={() => isInPeriod && onSelect(isoDate)}
      onKeyDown={handleKeyDown}
      className="cal-day-cell"
      data-selected={isSelected ? 'true' : undefined}
      data-today={isToday ? 'true' : undefined}
      data-in-period={isInPeriod ? 'true' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '8px 4px',
        borderRadius: 8,
        cursor: isInPeriod ? 'pointer' : 'default',
        opacity: isInPeriod ? 1 : 0.3,
        backgroundColor: isSelected ? 'var(--color, #44403C)' : isToday ? todayBg : 'transparent',
        border: '1px solid transparent',
        transition: 'background 0.12s',
        minHeight: 52,
        outline: 'none',
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: isToday ? 600 : 400,
          color: isSelected || isToday ? '#FFFFFF' : 'var(--color, #1C1917)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {day}
      </span>

      {/* Transaction dots: individual per type (Req 17.5, 17.6, 17.7) */}
      <span
        style={{ display: 'flex', gap: 3, height: 6, alignItems: 'center' }}
        aria-hidden="true"
      >
        {hasIncome && (
          <span
            data-dot="income"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isSelected ? '#FAFAF9' : DOT_COLORS.income,
              flexShrink: 0,
            }}
          />
        )}
        {hasExpense && (
          <span
            data-dot="expense"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isSelected ? '#FAFAF9' : DOT_COLORS.expense,
              flexShrink: 0,
            }}
          />
        )}
        {!hasIncome && !hasExpense && (
          <span style={{ width: 6, height: 6, flexShrink: 0 }} />
        )}
      </span>
    </div>
  );
}
