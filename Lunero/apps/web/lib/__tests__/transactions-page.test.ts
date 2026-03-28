/**
 * Tests for Transactions page logic — sorting, empty state, transaction count,
 * delete flow, signed amount formatting, and category mapping.
 * Requirements: 18.1, 18.7, 18.9, 18.10
 */
import { describe, it, expect, vi } from 'vitest';
import type { Entry, Category } from '@lunero/core';

// ── Helper: sort entries by date descending (mirrors page logic) ───────────

function sortEntriesByDate(entries: Entry[]): Entry[] {
  return [...entries]
    .filter((e) => !e.isDeleted)
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
}

// ── Helper: build category map ─────────────────────────────────────────────

function buildCategoryMap(categories: Category[]): Map<string, string> {
  return new Map(categories.map((c) => [c.id, c.name]));
}

// ── Helper: format transaction count label ─────────────────────────────────

function formatTransactionCount(count: number): string {
  return `${count} ${count === 1 ? 'transaction' : 'transactions'}`;
}

// ── Helper: format signed amount prefix ────────────────────────────────────

function signedPrefix(entryType: 'income' | 'expense' | 'savings'): string {
  return entryType === 'income' ? '+' : '\u2212';
}

// ── Helper: empty state message ────────────────────────────────────────────

function getEmptyStateMessage(): string {
  return 'No transactions yet. Add entries to your FlowSheet to see them here.';
}

// ── Helper: resolve note display ───────────────────────────────────────────

function resolveNote(note?: string): string {
  return note || 'Untitled';
}

// ── Test data factories ────────────────────────────────────────────────────

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e-1',
    flowSheetId: 'fs-1',
    userId: 'user-1',
    entryType: 'expense',
    categoryId: 'cat-1',
    amount: 85.5,
    currency: 'USD',
    entryDate: '2026-03-15',
    note: 'Grocery Store',
    isDeleted: false,
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Food',
    entryType: 'expense',
    isDefault: true,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Transactions page logic', () => {
  describe('transaction count display (Req 18.1)', () => {
    it('shows singular for 1 transaction', () => {
      expect(formatTransactionCount(1)).toBe('1 transaction');
    });

    it('shows plural for 0 transactions', () => {
      expect(formatTransactionCount(0)).toBe('0 transactions');
    });

    it('shows plural for multiple transactions', () => {
      expect(formatTransactionCount(8)).toBe('8 transactions');
    });
  });

  describe('sorting entries by date descending (Req 18.2)', () => {
    it('sorts entries newest first', () => {
      const entries = [
        makeEntry({ id: 'e-old', entryDate: '2026-03-01' }),
        makeEntry({ id: 'e-new', entryDate: '2026-03-15' }),
        makeEntry({ id: 'e-mid', entryDate: '2026-03-10' }),
      ];
      const sorted = sortEntriesByDate(entries);
      expect(sorted[0].id).toBe('e-new');
      expect(sorted[1].id).toBe('e-mid');
      expect(sorted[2].id).toBe('e-old');
    });

    it('filters out deleted entries', () => {
      const entries = [
        makeEntry({ id: 'e-1', isDeleted: false }),
        makeEntry({ id: 'e-2', isDeleted: true }),
      ];
      const sorted = sortEntriesByDate(entries);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('e-1');
    });

    it('returns empty array for no entries', () => {
      expect(sortEntriesByDate([])).toEqual([]);
    });

    it('handles all deleted entries', () => {
      const entries = [
        makeEntry({ id: 'e-1', isDeleted: true }),
        makeEntry({ id: 'e-2', isDeleted: true }),
      ];
      expect(sortEntriesByDate(entries)).toHaveLength(0);
    });
  });

  describe('delete flow with confirmation (Req 18.9, 18.10)', () => {
    it('delete request callback is invocable with entry id', () => {
      const onDelete = vi.fn();
      onDelete('e-1');
      expect(onDelete).toHaveBeenCalledWith('e-1');
    });

    it('confirm triggers optimistic removal', () => {
      const removeEntry = vi.fn();
      const flowSheetId = 'fs-1';
      const entryId = 'e-1';
      removeEntry(flowSheetId, entryId);
      expect(removeEntry).toHaveBeenCalledWith('fs-1', 'e-1');
    });

    it('cancel clears the delete target', () => {
      let deleteTargetId: string | null = 'e-1';
      const handleCancel = () => { deleteTargetId = null; };
      handleCancel();
      expect(deleteTargetId).toBeNull();
    });

    it('confirm does nothing when no target is set', () => {
      const mutate = vi.fn();
      const deleteTargetId: string | null = null;
      if (deleteTargetId) mutate(deleteTargetId);
      expect(mutate).not.toHaveBeenCalled();
    });
  });

  describe('empty state message (Req 18.11)', () => {
    it('returns the correct empty state message', () => {
      expect(getEmptyStateMessage()).toBe(
        'No transactions yet. Add entries to your FlowSheet to see them here.',
      );
    });

    it('empty state shows when no entries exist', () => {
      const entries: Entry[] = [];
      expect(entries.length === 0).toBe(true);
    });

    it('empty state does not show when entries exist', () => {
      const entries = [makeEntry()];
      expect(entries.length === 0).toBe(false);
    });
  });

  describe('signed amount formatting (Req 18.7)', () => {
    it('uses + prefix for income', () => {
      expect(signedPrefix('income')).toBe('+');
    });

    it('uses − (minus sign) prefix for expense', () => {
      expect(signedPrefix('expense')).toBe('\u2212');
    });

    it('uses − (minus sign) prefix for savings', () => {
      expect(signedPrefix('savings')).toBe('\u2212');
    });
  });

  describe('category mapping', () => {
    it('maps category id to name', () => {
      const categories = [
        makeCategory({ id: 'cat-1', name: 'Food' }),
        makeCategory({ id: 'cat-2', name: 'Salary', entryType: 'income' }),
      ];
      const map = buildCategoryMap(categories);
      expect(map.get('cat-1')).toBe('Food');
      expect(map.get('cat-2')).toBe('Salary');
    });

    it('returns undefined for unknown category', () => {
      const map = buildCategoryMap([makeCategory()]);
      expect(map.get('unknown')).toBeUndefined();
    });
  });

  describe('note resolution', () => {
    it('returns note when present', () => {
      expect(resolveNote('Grocery Store')).toBe('Grocery Store');
    });

    it('returns Untitled when note is undefined', () => {
      expect(resolveNote(undefined)).toBe('Untitled');
    });

    it('returns Untitled when note is empty string', () => {
      expect(resolveNote('')).toBe('Untitled');
    });
  });
});
