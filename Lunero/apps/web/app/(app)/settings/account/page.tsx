'use client';

import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';

// Clerk's UserProfile handles email/password changes with built-in re-authentication flows.
export default function AccountPage() {
  return (
    <main aria-label="Account management" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/settings"
          style={{ fontSize: 13, color: '#78716C', textDecoration: 'none' }}
          aria-label="Back to settings"
        >
          ← Back to settings
        </Link>
      </div>
      <UserProfile
        appearance={{
          elements: {
            rootBox: { width: '100%' },
            card: {
              borderRadius: 12,
              boxShadow: 'none',
              border: '1px solid #E7E5E4',
            },
          },
        }}
      />
    </main>
  );
}
