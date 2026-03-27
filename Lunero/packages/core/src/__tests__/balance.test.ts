import { describe, it, expect } from 'vitest';
import { computeAvailableBalance } from '../balance';
import type { Entry } from '../types';

const base: Omit<Entry, 'entryType' | 'amount' | 'id'> = {
  flowSheetId: 'fs1',
  userId: 'u1',
  categoryId: 'cat1',
  currency: 'USD',
  entryDate: '2024-01-01',
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function entry(id: string, entryType: Entry['entryType'], amount: number, overrides: Partial<Entry> = {}): Entry {
  return { ...base, id, entryType, amount, ...overrides };
}

describe('computeAvailableBalance', () => {
  it('returns 0 for empty entries', () => {
    expect(computeAvailableBalance([])).toBe(0);
  });

  it('income only', () => {
    expect(computeAvailableBalance([entry('1', 'income', 1000)])).toBe(1000);
  });

  it('income minus expenses', () => {
    const entries = [entry('1', 'income', 1000), entry('2', 'expense', 400)];
    expect(computeAvailableBalance(entries)).toBe(600);
  });

  it('income minus expenses and savings', () => {
    const entries = [
      entry('1', 'income', 3000),
      entry('2', 'expense', 800),
      entry('3', 'savings', 500),
    ];
    expect(computeAvailableBalance(entries)).toBe(1700);
  });

  it('uses convertedAmount when present', () => {
    const entries = [
      entry('1', 'income', 1000, { convertedAmount: 1100 }),
      entry('2', 'expense', 400, { convertedAmount: 440 }),
    ];
    expect(computeAvailableBalance(entries)).toBe(660);
  });

  it('falls back to amount when convertedAmount is undefined', () => {
    const entries = [
      entry('1', 'income', 1000, { convertedAmount: undefined }),
      entry('2', 'expense', 300),
    ];
    expect(computeAvailableBalance(entries)).toBe(700);
  });

  it('excludes soft-deleted entries', () => {
    const entries = [
      entry('1', 'income', 1000),
      entry('2', 'expense', 200, { isDeleted: true }),
    ];
    expect(computeAvailableBalance(entries)).toBe(1000);
  });

  it('can produce a negative balance', () => {
    const entries = [entry('1', 'income', 100), entry('2', 'expense', 500)];
    expect(computeAvailableBalance(entries)).toBe(-400);
  });

  it('multiple entries of same type sum correctly', () => {
    const entries = [
      entry('1', 'income', 1000),
      entry('2', 'income', 500),
      entry('3', 'expense', 200),
      entry('4', 'expense', 300),
      entry('5', 'savings', 100),
    ];
    expect(computeAvailableBalance(entries)).toBe(900);
  });
});
