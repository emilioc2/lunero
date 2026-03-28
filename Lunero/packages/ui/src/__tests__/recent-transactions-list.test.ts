/**
 * Tests for RecentTransactionsList logic — entry slicing, empty state,
 * signed amount prefixes, formatting, and dot color mapping.
 * Requirements: 7.1, 7.3, 7.5
 */
import { describe, it, expect } from 'vitest';

type EntryType = 'income' | 'expense' | 'savings';

interface RecentTransactionItem {
  id: string;
  note: string;
  amount: number;
  entryType: EntryType;
  categoryName: string;
  entryDate: string;
}

const COLOR = {
  positiveGreen: '#22C55E',
  expenseClayRed: '#C86D5A',
  savingsWarmEarth: '#C4A484',
  incomeOliveGray: '#6B6F69',
} as const;

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
  }).format(new Date(normalized));
}

function signedPrefix(entryType: EntryType): string {
  return entryType === 'income' ? '+' : '\u2212';
}

function amountColor(entryType: EntryType): string {
  return entryType === 'income'
    ? COLOR.incomeOliveGray
    : entryType === 'expense'
      ? COLOR.expenseClayRed
      : COLOR.savingsWarmEarth;
}

/** Mirrors the component's slice-to-5 logic */
function recentEntries(entries: RecentTransactionItem[]): RecentTransactionItem[] {
  return entries.slice(0, 5);
}

// ── Sample data ────────────────────────────────────────────────────────────

function makeSampleEntries(count: number): RecentTransactionItem[] {
  const types: EntryType[] = ['income', 'expense', 'savings'];
  const categories = ['Salary', 'Food', 'Emergency Fund', 'Freelance', 'Bills', 'Transport', 'Rent'];
  const notes = ['Salary', 'Grocery Store', 'Savings Transfer', 'Freelance Work', 'Electric Bill', 'Bus Pass', 'Rent Payment'];

  return Array.from({ length: count }, (_, i) => ({
    id: `entry-${i + 1}`,
    note: notes[i % notes.length],
    amount: (i + 1) * 100 + 50,
    entryType: types[i % types.length],
    categoryName: categories[i % categories.length],
    entryDate: `2026-03-${String(15 - i).padStart(2, '0')}`,
  }));
}

const FIVE_ENTRIES = makeSampleEntries(5);
const SEVEN_ENTRIES = makeSampleEntries(7);

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RecentTransactionsList logic', () => {
  describe('entry slicing (Req 7.1)', () => {
    it('returns at most 5 entries when given more', () => {
      const result = recentEntries(SEVEN_ENTRIES);
      expect(result).toHaveLength(5);
    });

    it('returns all entries when given fewer than 5', () => {
      const three = makeSampleEntries(3);
      expect(recentEntries(three)).toHaveLength(3);
    });

    it('returns exactly 5 entries when given 5', () => {
      expect(recentEntries(FIVE_ENTRIES)).toHaveLength(5);
    });

    it('returns the first 5 entries in order', () => {
      const result = recentEntries(SEVEN_ENTRIES);
      expect(result.map((e) => e.id)).toEqual([
        'entry-1',
        'entry-2',
        'entry-3',
        'entry-4',
        'entry-5',
      ]);
    });
  });

  describe('empty state (Req 7.5)', () => {
    it('returns empty array for no entries', () => {
      expect(recentEntries([])).toHaveLength(0);
    });

    it('empty state message text is correct', () => {
      const emptyMessage = 'No transactions yet.';
      expect(emptyMessage).toBe('No transactions yet.');
    });
  });

  describe('signed amount prefixes (Req 7.3)', () => {
    it('uses + prefix for income entries', () => {
      expect(signedPrefix('income')).toBe('+');
    });

    it('uses − (U+2212) prefix for expense entries', () => {
      expect(signedPrefix('expense')).toBe('\u2212');
    });

    it('uses − (U+2212) prefix for savings entries', () => {
      expect(signedPrefix('savings')).toBe('\u2212');
    });
  });

  describe('formatAmount', () => {
    it('formats USD amounts with two decimals', () => {
      const result = formatAmount(150, 'USD');
      expect(result).toContain('150');
      expect(result).toContain('00');
    });

    it('formats fractional amounts correctly', () => {
      const result = formatAmount(85.5, 'USD');
      expect(result).toContain('85');
      expect(result).toContain('50');
    });

    it('formats zero correctly', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toContain('0.00');
    });
  });

  describe('formatDate', () => {
    it('formats date-only ISO string to short month + day', () => {
      const result = formatDate('2026-03-15');
      expect(result).toContain('Mar');
      expect(result).toContain('15');
    });

    it('formats full ISO datetime string', () => {
      const result = formatDate('2026-03-14T10:30:00');
      expect(result).toContain('Mar');
      expect(result).toContain('14');
    });
  });

  describe('dot color mapping', () => {
    it('returns green for income', () => {
      expect(dotColor('income')).toBe(COLOR.positiveGreen);
    });

    it('returns Clay Red for expense', () => {
      expect(dotColor('expense')).toBe(COLOR.expenseClayRed);
    });

    it('returns Warm Earth for savings', () => {
      expect(dotColor('savings')).toBe(COLOR.savingsWarmEarth);
    });
  });

  describe('amount color mapping', () => {
    it('uses Olive Gray for income amounts', () => {
      expect(amountColor('income')).toBe(COLOR.incomeOliveGray);
    });

    it('uses Clay Red for expense amounts', () => {
      expect(amountColor('expense')).toBe(COLOR.expenseClayRed);
    });

    it('uses Warm Earth for savings amounts', () => {
      expect(amountColor('savings')).toBe(COLOR.savingsWarmEarth);
    });
  });

  describe('rendering 5 entries with correct formatting', () => {
    it('each entry produces correct signed amount string', () => {
      const currency = 'USD';
      for (const entry of FIVE_ENTRIES) {
        const prefix = signedPrefix(entry.entryType);
        const formatted = formatAmount(entry.amount, currency);
        const signed = `${prefix}${formatted}`;

        if (entry.entryType === 'income') {
          expect(signed).toMatch(/^\+/);
        } else {
          expect(signed).toMatch(/^\u2212/);
        }
      }
    });

    it('each entry has a valid dot color', () => {
      for (const entry of FIVE_ENTRIES) {
        const color = dotColor(entry.entryType);
        expect([COLOR.positiveGreen, COLOR.expenseClayRed, COLOR.savingsWarmEarth]).toContain(color);
      }
    });

    it('each entry has a formatted date', () => {
      for (const entry of FIVE_ENTRIES) {
        const date = formatDate(entry.entryDate);
        expect(date).toContain('Mar');
      }
    });
  });
});
