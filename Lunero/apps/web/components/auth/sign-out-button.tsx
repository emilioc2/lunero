'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface SignOutButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export function SignOutButton({ children = 'Sign out', className }: SignOutButtonProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
  }

  return (
    <button
      onClick={handleSignOut}
      className={className}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        padding: '8px 10px',
        borderRadius: 8,
        opacity: 0.65,
        textAlign: 'left',
        width: '100%',
      }}
    >
      {children}
    </button>
  );
}
