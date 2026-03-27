// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore } from '../theme-store';

// Mock window.matchMedia
function mockSystemTheme(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: dark && query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: 'system', resolvedTheme: 'light' });
  });

  it('setPreference to light resolves to light', () => {
    useThemeStore.getState().setPreference('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('setPreference to dark resolves to dark', () => {
    useThemeStore.getState().setPreference('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(useThemeStore.getState().preference).toBe('dark');
  });

  it('setPreference to system resolves against OS — dark system', () => {
    mockSystemTheme(true);
    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('setPreference to system resolves against OS — light system', () => {
    mockSystemTheme(false);
    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });

  it('resolveSystemTheme updates resolvedTheme for system preference', () => {
    mockSystemTheme(true);
    useThemeStore.setState({ preference: 'system', resolvedTheme: 'light' });
    useThemeStore.getState().resolveSystemTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('resolveSystemTheme does not override explicit light preference', () => {
    mockSystemTheme(true);
    useThemeStore.setState({ preference: 'light', resolvedTheme: 'light' });
    useThemeStore.getState().resolveSystemTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });

  it('resolveSystemTheme does not override explicit dark preference', () => {
    mockSystemTheme(false);
    useThemeStore.setState({ preference: 'dark', resolvedTheme: 'dark' });
    useThemeStore.getState().resolveSystemTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });
});
