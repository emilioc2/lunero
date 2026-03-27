'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/past', label: 'Past Sheets', icon: '◷' },
  { href: '/calendar', label: 'Calendar', icon: '▦' },
  { href: '/trends', label: 'Trends', icon: '↗' },
  { href: '/recurring', label: 'Recurring', icon: '↺' },
  { href: '/categories', label: 'Categories', icon: '◉' },
  { href: '/mira', label: 'Mira', icon: '✦' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 220,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        borderRight: '1px solid var(--border-color, #E7E5E4)',
        gap: 4,
      }}
    >
      {/* Wordmark */}
      <div style={{ paddingBottom: 32, paddingLeft: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>lunero</span>
      </div>

      {/* Nav links */}
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  opacity: active ? 1 : 0.65,
                  background: active ? 'rgba(0,0,0,0.05)' : 'transparent',
                  transition: 'opacity 0.15s, background 0.15s',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bottom: help, settings + user */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 16 }}>
        <Link
          href="/tutorial"
          aria-label="Re-launch tutorial"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            opacity: 0.65,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 16, width: 20, textAlign: 'center' }}>?</span>
          Tutorial
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            opacity: 0.65,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 16, width: 20, textAlign: 'center' }}>⚙</span>
          Settings
        </Link>
        <div style={{ paddingLeft: 10 }}>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </nav>
  );
}
