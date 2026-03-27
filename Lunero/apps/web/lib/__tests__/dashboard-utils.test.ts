import { describe, it, expect } from 'vitest';
import type { Entry } from '@lunero/core';

// ── Helpers extracted from dashboard page for testability ──────────────────

function formatPeriodLabel(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt.format(new Date(startDate))} – ${fmt.format(new Date(endDate))}`;
}

type EntryWithSuggestion = Entry & { recurringPatternDetected?: boolean };

function findSuggestedEntry(
  entries: EntryWithSuggestion[],
  dismissed: Set<string>,
): EntryWithSuggestion | undefined {
  return entries.find(
    (e) => !e.isDeleted && e.recurringPatternDetected === true && !dismissed.has(e.categoryId),
  );
}

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<EntryWithSuggestion> = {}): EntryWithSuggestion {
  return {
    id: 'e1',
    flowSheetId: 'fs1',
    userId: 'u1',
    entryType: 'expense',
    categoryId: 'cat1',
    amount: 100,
    currency: 'USD',
    entryDate: '2024-01-15',
    isDeleted: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('formatPeriodLabel', () => {
  it('formats a monthly range correctly', () => {
    const label = formatPeriodLabel('2024-01-01', '2024-01-31');
    expect(label).toContain('Jan');
    expect(label).toContain('2024');
    expect(label).toContain('–');
  });

  it('formats a weekly range correctly', () => {
    const label = formatPeriodLabel('2024-03-04', '2024-03-10');
    expect(label).toContain('Mar');
    expect(label).toContain('–');
  });

  it('handles same-day range', () => {
    const label = formatPeriodLabel('2024-06-15', '2024-06-15');
    expect(label).toContain('Jun');
    expect(label).toContain('15');
  });
});

describe('findSuggestedEntry', () => {
  it('returns undefined when no entries have the flag', () => {
    const entries = [makeEntry(), makeEntry({ id: 'e2' })];
    expect(findSuggestedEntry(entries, new Set())).toBeUndefined();
  });

  it('returns the flagged entry', () => {
    const flagged = makeEntry({ id: 'e2', recurringPatternDetected: true });
    const entries = [makeEntry(), flagged];
    expect(findSuggestedEntry(entries, new Set())).toBe(flagged);
  });

  it('skips deleted entries even if flagged', () => {
    const entries = [makeEntry({ recurringPatternDetected: true, isDeleted: true })];
    expect(findSuggestedEntry(entries, new Set())).toBeUndefined();
  });

  it('skips dismissed category suggestions', () => {
    const flagged = makeEntry({ recurringPatternDetected: true, categoryId: 'cat1' });
    expect(findSuggestedEntry([flagged], new Set(['cat1']))).toBeUndefined();
  });

  it('returns suggestion for non-dismissed category when another is dismissed', () => {
    const dismissed = makeEntry({ id: 'e1', recurringPatternDetected: true, categoryId: 'cat1' });
    const active = makeEntry({ id: 'e2', recurringPatternDetected: true, categoryId: 'cat2' });
    const result = findSuggestedEntry([dismissed, active], new Set(['cat1']));
    expect(result).toBe(active);
  });

  it('returns first match when multiple are flagged', () => {
    const first = makeEntry({ id: 'e1', recurringPatternDetected: true, categoryId: 'cat1' });
    const second = makeEntry({ id: 'e2', recurringPatternDetected: true, categoryId: 'cat2' });
    expect(findSuggestedEntry([first, second], new Set())).toBe(first);
  });
});
