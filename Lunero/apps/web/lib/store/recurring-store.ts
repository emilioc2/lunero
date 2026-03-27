import { create } from 'zustand';
import type { RecurringEntry } from '@lunero/core';

interface RecurringState {
  recurringEntries: RecurringEntry[];
  setRecurringEntries: (entries: RecurringEntry[]) => void;
}

export const useRecurringStore = create<RecurringState>((set) => ({
  recurringEntries: [],
  setRecurringEntries: (recurringEntries) => set({ recurringEntries }),
}));
