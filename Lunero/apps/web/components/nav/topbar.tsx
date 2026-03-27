'use client';

export function Topbar() {
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
      {/* Theme toggle hidden for Phase 1 Web */}
    </header>
  );
}
