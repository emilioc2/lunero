import { describe, it, expect, beforeEach } from 'vitest';
import { useEntryStore } from '../entry-store';
import type { Entry } from '@lunero/core';

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    flowSheetId: 'fs1',
    userId: 'u1',
    entryType: 'expense',
    categoryId: 'c1',
    amount: 100,
    currency: 'USD',
    entryDate: '2024-01-15',
    isDeleted: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('useEntryStore', () => {
  beforeEach(() => {
    useEntryStore.setState({ entriesBySheet: {} });
  });

  it('setEntries replaces entries for a sheet', () => {
    const entries = [makeEntry(), makeEntry({ id: 'e2' })];
    useEntryStore.getState().setEntries('fs1', entries);
    expect(useEntryStore.getState().entriesBySheet['fs1']).toHaveLength(2);
  });

  it('addEntry appends to the correct sheet', () => {
    useEntryStore.getState().setEntries('fs1', [makeEntry()]);
    useEntryStore.getState().addEntry(makeEntry({ id: 'e2' }));
    expect(useEntryStore.getState().entriesBySheet['fs1']).toHaveLength(2);
  });

  it('addEntry creates sheet bucket if not present', () => {
    useEntryStore.getState().addEntry(makeEntry({ flowSheetId: 'fs2' }));
    expect(useEntryStore.getState().entriesBySheet['fs2']).toHaveLength(1);
  });

  it('updateEntry replaces the matching entry', () => {
    useEntryStore.getState().setEntries('fs1', [makeEntry({ amount: 100 })]);
    useEntryStore.getState().updateEntry(makeEntry({ amount: 250 }));
    expect(useEntryStore.getState().entriesBySheet['fs1'][0].amount).toBe(250);
  });

  it('updateEntry leaves other entries untouched', () => {
    useEntryStore.getState().setEntries('fs1', [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]);
    useEntryStore.getState().updateEntry(makeEntry({ id: 'e1', amount: 999 }));
    const entries = useEntryStore.getState().entriesBySheet['fs1'];
    expect(entries.find((e) => e.id === 'e2')?.amount).toBe(100);
  });

  it('removeEntry removes the matching entry', () => {
    useEntryStore.getState().setEntries('fs1', [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]);
    useEntryStore.getState().removeEntry('fs1', 'e1');
    const entries = useEntryStore.getState().entriesBySheet['fs1'];
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('e2');
  });

  it('removeEntry on unknown sheet does not throw', () => {
    expect(() => useEntryStore.getState().removeEntry('unknown', 'e1')).not.toThrow();
  });

  it('setEntries does not affect other sheets', () => {
    useEntryStore.getState().setEntries('fs1', [makeEntry()]);
    useEntryStore.getState().setEntries('fs2', [makeEntry({ id: 'e2', flowSheetId: 'fs2' })]);
    expect(useEntryStore.getState().entriesBySheet['fs1']).toHaveLength(1);
    expect(useEntryStore.getState().entriesBySheet['fs2']).toHaveLength(1);
  });
});
