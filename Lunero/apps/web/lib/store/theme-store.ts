import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemePreference } from '@lunero/core';

interface ThemeState {
  // The user's explicit preference (or 'system' if not overridden)
  preference: ThemePreference;
  // The resolved theme actually applied — 'light' or 'dark'
  resolvedTheme: 'light' | 'dark';
  setPreference: (pref: ThemePreference) => void;
  // Called on mount to resolve 'system' against the OS media query
  resolveSystemTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return getSystemTheme();
  return pref;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      resolvedTheme: 'light', // safe SSR default; corrected on mount via resolveSystemTheme

      setPreference: (pref) =>
        set({ preference: pref, resolvedTheme: resolve(pref) }),

      resolveSystemTheme: () =>
        set({ resolvedTheme: resolve(get().preference) }),
    }),
    {
      name: 'lunero-theme',
      // Only persist the user's explicit preference, not the resolved value
      partialize: (s) => ({ preference: s.preference }),
    },
  ),
);
