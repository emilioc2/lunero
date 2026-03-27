import { describe, it, expect } from 'vitest';
import { isWithinPeriod, getNextPeriodRange, shouldAutoArchive } from '../period';
import type { FlowSheet } from '../types';

function sheet(overrides: Partial<FlowSheet> = {}): FlowSheet {
  return {
    id: 'fs1',
    userId: 'u1',
    periodType: 'monthly',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'active',
    editLocked: false,
    availableBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('isWithinPeriod', () => {
  it('returns true for a date on the start boundary', () => {
    expect(isWithinPeriod(new Date('2024-01-01'), sheet())).toBe(true);
  });

  it('returns true for a date on the end boundary', () => {
    expect(isWithinPeriod(new Date('2024-01-31'), sheet())).toBe(true);
  });

  it('returns true for a date in the middle', () => {
    expect(isWithinPeriod(new Date('2024-01-15'), sheet())).toBe(true);
  });

  it('returns false for a date before the period', () => {
    expect(isWithinPeriod(new Date('2023-12-31'), sheet())).toBe(false);
  });

  it('returns false for a date after the period', () => {
    expect(isWithinPeriod(new Date('2024-02-01'), sheet())).toBe(false);
  });
});

describe('getNextPeriodRange', () => {
  it('weekly: next period starts day after end, spans 7 days', () => {
    const s = sheet({ periodType: 'weekly', startDate: '2024-01-01', endDate: '2024-01-07' });
    const { start, end } = getNextPeriodRange(s);
    expect(start.toISOString().slice(0, 10)).toBe('2024-01-08');
    expect(end.toISOString().slice(0, 10)).toBe('2024-01-14');
  });

  it('monthly: next period starts day after end, ends one month later minus one day', () => {
    const s = sheet({ periodType: 'monthly', startDate: '2024-01-01', endDate: '2024-01-31' });
    const { start, end } = getNextPeriodRange(s);
    expect(start.toISOString().slice(0, 10)).toBe('2024-02-01');
    expect(end.toISOString().slice(0, 10)).toBe('2024-02-29'); // 2024 is a leap year
  });

  it('custom: repeats same duration', () => {
    // 10-day custom period
    const s = sheet({ periodType: 'custom', startDate: '2024-01-01', endDate: '2024-01-10' });
    const { start, end } = getNextPeriodRange(s);
    expect(start.toISOString().slice(0, 10)).toBe('2024-01-11');
    expect(end.toISOString().slice(0, 10)).toBe('2024-01-20');
  });
});

describe('shouldAutoArchive', () => {
  it('returns true when end date is before now', () => {
    const s = sheet({ endDate: '2024-01-31', status: 'active' });
    expect(shouldAutoArchive(s, new Date('2024-02-01'))).toBe(true);
  });

  it('returns false when end date is today', () => {
    const s = sheet({ endDate: '2024-01-31', status: 'active' });
    expect(shouldAutoArchive(s, new Date('2024-01-31'))).toBe(false);
  });

  it('returns false when end date is in the future', () => {
    const s = sheet({ endDate: '2024-01-31', status: 'active' });
    expect(shouldAutoArchive(s, new Date('2024-01-15'))).toBe(false);
  });

  it('returns false when sheet is already archived', () => {
    const s = sheet({ endDate: '2024-01-01', status: 'archived' });
    expect(shouldAutoArchive(s, new Date('2024-02-01'))).toBe(false);
  });
});
