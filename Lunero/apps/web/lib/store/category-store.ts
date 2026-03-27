import { create } from 'zustand';
import type { Category } from '@lunero/core';

interface CategoryState {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  setCategories: (categories) => set({ categories }),
}));
