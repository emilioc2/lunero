'use client';

import { useThemeStore } from '../../lib/store/theme-store';
import { useUpdateProfile } from '../../lib/hooks/use-profile';
import type { ThemePreference } from '@lunero/core';

export function Topbar() {
  const { resolvedTheme, preference, setPreference } = useThemeStore();
  const { mutate: updateProfile } = useUpdateProfile();

  function toggleTheme() {
    const next: ThemePreference = resolvedTheme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    updateProfile({ themePreference: next });
  }

  return (
    <header
      role="banner"
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        borderBottom: '1px solid var(--border-color, #E7E5E4)',
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${preference === 'system' ? 'system' : preference}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          padding: '4px 8px',
          borderRadius: 6,
          opacity: 0.7,
        }}
        className="topbar-theme-btn"
      >
        {resolvedTheme === 'dark' ? '\u2600' : '\u263E'}
      </button>

      <style>{`
        .topbar-theme-btn:focus-visible {
          outline: 2px solid #44403C;
          outline-offset: 2px;
          opacity: 1;
        }
        .topbar-theme-btn:hover {
          opacity: 1;
          background: var(--hover-bg, #F5F5F4) !important;
        }
      `}</style>
    </header>
  );
}
