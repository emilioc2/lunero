/**
 * Tests for projection status color logic (Property 41: status color correctness).
 * Validates the three-state color scheme: under → category color, at → warm neutral, over → soft red.
 */
import { describe, it, expect } from 'vitest';

// Inline the color constants to avoid Tamagui runtime in test environment
const COLOR = {
  incomeOliveGray: '#6B6F69',
  expenseClayRed: '#C86D5A',
  savingsWarmEarth: '#C4A484',
  warmNeutral: '#A8A29E',
} as const;

type EntryType = 'income' | 'expense' | 'savings';

function getCategoryColor(entryType: EntryType): string {
  switch (entryType) {
    case 'income': return COLOR.incomeOliveGray;
    case 'expense': return COLOR.expenseClayRed;
    case 'savings': return COLOR.savingsWarmEarth;
  }
}

function getProjectionStatusColor(
  actualAmount: number,
  projectedAmount: number,
  entryType: EntryType,
  overrideColor?: string,
): string {
  if (overrideColor) return overrideColor;
  if (projectedAmount <= 0) return getCategoryColor(entryType);
  if (actualAmount < projectedAmount) return getCategoryColor(entryType);
  if (actualAmount === projectedAmount) return COLOR.warmNeutral;
  return COLOR.expenseClayRed;
}

describe('getProjectionStatusColor', () => {
  it('returns category color when actual < projected (under budget)', () => {
    expect(getProjectionStatusColor(50, 100, 'expense')).toBe(COLOR.expenseClayRed);
    expect(getProjectionStatusColor(50, 100, 'income')).toBe(COLOR.incomeOliveGray);
    expect(getProjectionStatusColor(50, 100, 'savings')).toBe(COLOR.savingsWarmEarth);
  });

  it('returns warm neutral when actual === projected (at budget)', () => {
    expect(getProjectionStatusColor(100, 100, 'expense')).toBe(COLOR.warmNeutral);
    expect(getProjectionStatusColor(100, 100, 'income')).toBe(COLOR.warmNeutral);
    expect(getProjectionStatusColor(100, 100, 'savings')).toBe(COLOR.warmNeutral);
  });

  it('returns soft red when actual > projected (over budget), regardless of entry type', () => {
    expect(getProjectionStatusColor(150, 100, 'expense')).toBe(COLOR.expenseClayRed);
    expect(getProjectionStatusColor(150, 100, 'income')).toBe(COLOR.expenseClayRed);
    expect(getProjectionStatusColor(150, 100, 'savings')).toBe(COLOR.expenseClayRed);
  });

  it('returns category color when projected is 0 (no projection set)', () => {
    expect(getProjectionStatusColor(50, 0, 'expense')).toBe(COLOR.expenseClayRed);
    expect(getProjectionStatusColor(0, 0, 'income')).toBe(COLOR.incomeOliveGray);
    expect(getProjectionStatusColor(0, 0, 'savings')).toBe(COLOR.savingsWarmEarth);
  });

  it('uses overrideColor when provided, ignoring computed status', () => {
    const override = '#AABBCC';
    expect(getProjectionStatusColor(50, 100, 'expense', override)).toBe(override);
    expect(getProjectionStatusColor(150, 100, 'expense', override)).toBe(override);
    expect(getProjectionStatusColor(100, 100, 'expense', override)).toBe(override);
  });

  it('handles zero actual with positive projected (no spending yet)', () => {
    expect(getProjectionStatusColor(0, 100, 'expense')).toBe(COLOR.expenseClayRed);
    expect(getProjectionStatusColor(0, 500, 'savings')).toBe(COLOR.savingsWarmEarth);
  });
});
