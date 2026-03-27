import { describe, it, expect } from 'vitest';
import { getRecurringEntriesForPeriod, detectRecurringSuggestions } from '../recurring';
import type { RecurringEntry, Entry } from '../types';

function recurring(overrides: Partial<RecurringEntry> = {}): RecurringEntry {
  return {
    id: 'r1',
    userId: 'u1',
    entryType: 'expense',
    categoryId: 'cat1',
    amount: 100,
    currency: 'USD',
    cadence: 'monthly',
    isPaused: false,
    isDeleted: false,
    ...overrides,
  };
}

const MONTHLY_PERIOD = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
const WEEKLY_PERIOD = { start: new Date('2024-01-01'), end: new Date('2024-01-07') };

describe('getRecurringEntriesForPeriod', () => {
  it('includes a monthly recurring entry in a monthly period', () => {
    const result = getRecurringEntriesForPeriod([recurring({ cadence: 'monthly' })], MONTHLY_PERIOD);
    expect(result).toHaveLength(1);
  });

  it('includes a weekly recurring entry in a monthly period', () => {
    const result = getRecurringEntriesForPeriod([recurring({ cadence: 'weekly' })], MONTHLY_PERIOD);
    expect(result).toHaveLength(1);
  });

  it('includes a daily recurring entry in any period', () => {
    const result = getRecurringEntriesForPeriod([recurring({ cadence: 'daily' })], WEEKLY_PERIOD);
    expect(result).toHaveLength(1);
  });

  it('excludes a monthly recurring entry from a weekly period', () => {
    const result = getRecurringEntriesForPeriod([recurring({ cadence: 'monthly' })], WEEKLY_PERIOD);
    expect(result).toHaveLength(0);
  });

  it('excludes paused entries', () => {
    const result = getRecurringEntriesForPeriod(
      [recurring({ cadence: 'monthly', isPaused: true })],
      MONTHLY_PERIOD
    );
    expect(result).toHaveLength(0);
  });

  it('excludes deleted entries', () => {
    const result = getRecurringEntriesForPeriod(
      [recurring({ cadence: 'monthly', isDeleted: true })],
      MONTHLY_PERIOD
    );
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no recurring entries', () => {
    expect(getRecurringEntriesForPeriod([], MONTHLY_PERIOD)).toHaveLength(0);
  });

  it('handles bi-weekly cadence correctly', () => {
    const biWeeklyPeriod = { start: new Date('2024-01-01'), end: new Date('2024-01-14') };
    const result = getRecurringEntriesForPeriod([recurring({ cadence: 'bi-weekly' })], biWeeklyPeriod);
    expect(result).toHaveLength(1);
  });
});

function entry(id: string, categoryId: string, amount: number, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    flowSheetId: 'fs1',
    userId: 'u1',
    entryType: 'expense',
    categoryId,
    amount,
    currency: 'USD',
    entryDate: '2024-01-15',
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('detectRecurringSuggestions', () => {
  it('returns empty when fewer than 3 periods', () => {
    const periods = [
      [entry('1', 'cat1', 100)],
      [entry('2', 'cat1', 100)],
    ];
    expect(detectRecurringSuggestions(periods)).toHaveLength(0);
  });

  it('detects a suggestion when same amount+category appears in 3 periods', () => {
    const periods = [
      [entry('1', 'cat1', 100)],
      [entry('2', 'cat1', 100)],
      [entry('3', 'cat1', 100)],
    ];
    const result = detectRecurringSuggestions(periods);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ categoryId: 'cat1', amount: 100 });
  });

  it('does not suggest when amount differs across periods', () => {
    const periods = [
      [entry('1', 'cat1', 100)],
      [entry('2', 'cat1', 200)],
      [entry('3', 'cat1', 100)],
    ];
    expect(detectRecurringSuggestions(periods)).toHaveLength(0);
  });

  it('excludes deleted entries from detection', () => {
    const periods = [
      [entry('1', 'cat1', 100, { isDeleted: true })],
      [entry('2', 'cat1', 100)],
      [entry('3', 'cat1', 100)],
    ];
    expect(detectRecurringSuggestions(periods)).toHaveLength(0);
  });

  it('handles multiple suggestions across different categories', () => {
    const periods = [
      [entry('1', 'cat1', 100), entry('4', 'cat2', 50)],
      [entry('2', 'cat1', 100), entry('5', 'cat2', 50)],
      [entry('3', 'cat1', 100), entry('6', 'cat2', 50)],
    ];
    const result = detectRecurringSuggestions(periods);
    expect(result).toHaveLength(2);
  });
});
