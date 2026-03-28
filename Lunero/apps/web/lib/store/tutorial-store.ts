import { create } from 'zustand';

interface TutorialState {
  isOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>((set) => ({
  isOpen: false,
  openTutorial: () => set({ isOpen: true }),
  closeTutorial: () => set({ isOpen: false }),
}));
