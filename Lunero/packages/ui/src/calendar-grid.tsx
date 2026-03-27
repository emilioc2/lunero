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

const CATEGORY_COLORS: Record<EntryType, string> = {
  income: '#6B6F69',
  expense: '#C86D5A',
  savings: '#C4A484',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Computes the dominant entry type for a day.
 * Validates Property 16: Calendar Dominant Type Computation.
 */
function dominantType(dayEntries: Entry[]): EntryType | null {
  if (dayEntries.length === 0) return null;
  const totals: Record<EntryType, number> = { income: 0, expense: 0, savings: 0 };
  for (const e of dayEntries) {
    totals[e.entryType] += e.convertedAmount ?? e.amount;
  }
  return (Object.entries(totals) as [EntryType, number][]).reduce(
    (best, [type, total]) => (total > totals[best] ? type : best),
    'income' as EntryType,
  );
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

  /**
   * Arrow key navigation within the grid.
   * Left/Right move by 1 day, Up/Down move by 7 days (one row).
   * Focus is moved to the target cell if it exists and is in-period.
   */
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
              fontSize: 11,
              fontWeight: 500,
              color: '#A8A29E',
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
          const dominant = dominantType(dayEntries);
          const isSelected = isoDate === selectedDate;
          const isToday = isoDate === toIsoDate(new Date());
          const dotColor = dominant ? CATEGORY_COLORS[dominant] : null;

          return (
            <DayCell
              key={isoDate}
              day={day}
              isoDate={isoDate}
              isInPeriod={isInPeriod}
              isSelected={isSelected}
              isToday={isToday}
              dotColor={dotColor}
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
  dotColor: string | null;
  entryCount: number;
  onSelect: (isoDate: string) => void;
}

function DayCell({
  day,
  isoDate,
  isInPeriod,
  isSelected,
  isToday,
  dotColor,
  entryCount,
  onSelect,
}: DayCellProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter/Space activate the cell; arrow keys are handled at the grid level
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isInPeriod) onSelect(isoDate);
    }
  };

  const ariaLabel = [
    // Use T00:00:00 to avoid UTC→local day-shift on date-only strings (Requirement 15.3)
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
        backgroundColor: isSelected ? '#44403C' : isToday ? '#F5F5F4' : 'transparent',
        border: isToday && !isSelected ? '1px solid #D6D3D1' : '1px solid transparent',
        transition: 'background 0.12s',
        minHeight: 52,
        outline: 'none',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: isToday ? 600 : 400,
          color: isSelected ? '#FAFAF9' : isToday ? '#1C1917' : '#44403C',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {day}
      </span>

      {dotColor ? (
        <span
          aria-hidden="true"
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: isSelected ? '#FAFAF9' : dotColor,
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ width: 5, height: 5, flexShrink: 0 }} aria-hidden="true" />
      )}
    </div>
  );
}
