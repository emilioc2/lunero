import { create } from 'zustand';
import type { FlowSheet } from '@lunero/core';

interface FlowSheetState {
  activeFlowSheet: FlowSheet | null;
  setActiveFlowSheet: (sheet: FlowSheet | null) => void;
}

export const useFlowSheetStore = create<FlowSheetState>((set) => ({
  activeFlowSheet: null,
  setActiveFlowSheet: (sheet) => set({ activeFlowSheet: sheet }),
}));
