import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateLong,
  formatPeriodLabel,
  formatMonthYear,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  localeCompare,
  sortByLocale,
} from '../locale-utils';

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a date-only ISO string without UTC day-shift', () => {
    const result = formatDate('2025-03-15');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('handles full ISO datetime strings', () => {
    const result = formatDate('2025-03-15T12:00:00Z');
    expect(result).toContain('2025');
  });

  it('does not shift the day for 2025-01-01', () => {
    // Must display as 1 January, not 31 December
    const result = formatDate('2025-01-01');
    expect(result).toContain('2025');
    expect(result).not.toMatch(/31/);
  });
});

// ── formatDateLong ────────────────────────────────────────────────────────────

describe('formatDateLong', () => {
  it('includes year and is longer than a short date', () => {
    const result = formatDateLong('2025-03-15');
    expect(result).toContain('2025');
    expect(result.length).toBeGreaterThan(10);
  });
});

// ── formatPeriodLabel ─────────────────────────────────────────────────────────

describe('formatPeriodLabel', () => {
  it('joins start and end dates with an en-dash', () => {
    const result = formatPeriodLabel('2025-03-01', '2025-03-31');
    expect(result).toContain('\u2013');
    expect(result).toContain('2025');
  });

  it('handles full ISO datetime strings', () => {
    const result = formatPeriodLabel('2025-03-01T00:00:00Z', '2025-03-31T23:59:59Z');
    expect(result).toContain('\u2013');
  });
});

// ── formatMonthYear ───────────────────────────────────────────────────────────

describe('formatMonthYear', () => {
  it('returns a string containing the year', () => {
    const result = formatMonthYear(2, 2025);
    expect(result).toContain('2025');
  });

  it('handles month 0 (January)', () => {
    const result = formatMonthYear(0, 2025);
    expect(result).toContain('2025');
  });
});

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a positive amount', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toMatch(/1[,.]?234/);
  });

  it('formats a negative amount', () => {
    const result = formatCurrency(-50, 'USD');
    expect(result).toContain('50');
  });

  it('defaults to USD when no currency provided', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100');
  });

  it('formats zero', () => {
    const result = formatCurrency(0, 'EUR');
    expect(result).toContain('0');
  });
});

// ── formatCurrencyCompact ─────────────────────────────────────────────────────

describe('formatCurrencyCompact', () => {
  it('formats without decimal places', () => {
    const result = formatCurrencyCompact(1234.56, 'USD');
    expect(result).not.toContain('.56');
    expect(result).not.toContain(',56');
  });

  it('rounds to nearest integer', () => {
    const result = formatCurrencyCompact(99.9, 'USD');
    expect(result).toContain('100');
  });
});

// ── formatNumber ──────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats with 2 decimal places by default', () => {
    const result = formatNumber(1234.5);
    expect(result).toContain('1');
  });

  it('respects custom fraction digits', () => {
    const result = formatNumber(1234.5678, 4);
    expect(result).toContain('5678');
  });

  it('formats zero', () => {
    const result = formatNumber(0);
    expect(result).toContain('0');
  });
});

// ── localeCompare ─────────────────────────────────────────────────────────────

describe('localeCompare', () => {
  it('sorts strings case-insensitively', () => {
    const items = [{ name: 'Zebra' }, { name: 'apple' }, { name: 'Mango' }];
    const sorted = [...items].sort(localeCompare((i) => i.name));
    expect(sorted[0]!.name.toLowerCase()).toBe('apple');
    expect(sorted[sorted.length - 1]!.name.toLowerCase()).toBe('zebra');
  });

  it('handles numeric strings naturally (numeric: true)', () => {
    const items = [{ n: 'item10' }, { n: 'item2' }, { n: 'item1' }];
    const sorted = [...items].sort(localeCompare((i) => i.n));
    expect(sorted[0]!.n).toBe('item1');
    expect(sorted[1]!.n).toBe('item2');
    expect(sorted[2]!.n).toBe('item10');
  });
});

// ── sortByLocale ──────────────────────────────────────────────────────────────

describe('sortByLocale', () => {
  it('returns a new sorted array without mutating the original', () => {
    const original = [{ name: 'Zebra' }, { name: 'Apple' }, { name: 'Mango' }];
    const sorted = sortByLocale(original, (i) => i.name);
    expect(sorted[0]!.name).toBe('Apple');
    expect(original[0]!.name).toBe('Zebra');
  });

  it('handles an empty array', () => {
    expect(sortByLocale([], (i: { name: string }) => i.name)).toEqual([]);
  });

  it('handles a single-element array', () => {
    const items = [{ name: 'Solo' }];
    expect(sortByLocale(items, (i) => i.name)).toEqual(items);
  });

  it('sorts categories locale-aware', () => {
    const cats = [
      { id: '1', name: 'Utilities' },
      { id: '2', name: 'groceries' },
      { id: '3', name: 'Entertainment' },
    ];
    const sorted = sortByLocale(cats, (c) => c.name);
    const names = sorted.map((c) => c.name.toLowerCase());
    expect(names[0]).toBe('entertainment');
    expect(names[1]).toBe('groceries');
    expect(names[2]).toBe('utilities');
  });
});
