import { create } from 'zustand';
import type { Entry } from '@lunero/core';

interface EntryState {
  // Optimistic entries keyed by flowSheetId
  entriesBySheet: Record<string, Entry[]>;
  setEntries: (flowSheetId: string, entries: Entry[]) => void;
  addEntry: (entry: Entry) => void;
  updateEntry: (entry: Entry) => void;
  removeEntry: (flowSheetId: string, entryId: string) => void;
}

export const useEntryStore = create<EntryState>((set) => ({
  entriesBySheet: {},

  setEntries: (flowSheetId, entries) =>
    set((s) => ({ entriesBySheet: { ...s.entriesBySheet, [flowSheetId]: entries } })),

  addEntry: (entry) =>
    set((s) => {
      const existing = s.entriesBySheet[entry.flowSheetId] ?? [];
      return {
        entriesBySheet: {
          ...s.entriesBySheet,
          [entry.flowSheetId]: [...existing, entry],
        },
      };
    }),

  updateEntry: (entry) =>
    set((s) => {
      const existing = s.entriesBySheet[entry.flowSheetId] ?? [];
      return {
        entriesBySheet: {
          ...s.entriesBySheet,
          [entry.flowSheetId]: existing.map((e) => (e.id === entry.id ? entry : e)),
        },
      };
    }),

  removeEntry: (flowSheetId, entryId) =>
    set((s) => {
      const existing = s.entriesBySheet[flowSheetId] ?? [];
      return {
        entriesBySheet: {
          ...s.entriesBySheet,
          [flowSheetId]: existing.filter((e) => e.id !== entryId),
        },
      };
    }),
}));
