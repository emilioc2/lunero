'use client';

import { TamaguiProvider } from '@tamagui/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import tamaguiConfig from '../tamagui.config';
import { queryClient } from '../lib/query-client';
import { useThemeStore } from '../lib/store/theme-store';

function TamaguiThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, preference, resolveSystemTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Resolve system theme on first mount
    resolveSystemTheme();

    // Keep in sync if user changes OS preference while app is open
    if (preference === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => resolveSystemTheme();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [preference, resolveSystemTheme]);

  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme={mounted ? resolvedTheme : 'light'}
      disableInjectCSS
    >
      {children}
    </TamaguiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <TamaguiThemeProvider>{children}</TamaguiThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
