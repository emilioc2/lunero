'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/nav/sidebar';
import { Topbar } from '../../components/nav/topbar';
import { useProfile } from '../../lib/hooks/use-profile';
import { useThemeStore } from '../../lib/store/theme-store';
import { useTutorial } from '../../lib/hooks/use-tutorial';
import { TutorialOverlay } from '@lunero/ui';
import { registerServiceWorker } from '../../lib/push-notifications';

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const setPreference = useThemeStore((s: ReturnType<typeof useThemeStore.getState>) => s.setPreference);
  const { isOpen, openTutorial, completeTutorial, skipTutorial } = useTutorial();
  // Prevent re-triggering on profile refetches within the same session
  const tutorialLaunched = useRef(false);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [profile, isLoading, router]);

  // Hydrate theme store from server-persisted preference on first load
  useEffect(() => {
    if (profile?.themePreference) {
      setPreference(profile.themePreference);
    }
  }, [profile?.themePreference, setPreference]);

  // Auto-launch tutorial once per session after onboarding is complete
  useEffect(() => {
    if (
      !isLoading &&
      profile?.onboardingComplete &&
      !profile?.tutorialComplete &&
      !tutorialLaunched.current
    ) {
      tutorialLaunched.current = true;
      openTutorial();
    }
  }, [profile, isLoading, openTutorial]);

  // Register service worker on mount so push notifications can be received
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Show nothing while checking — avoids flash of app content
  if (isLoading || (profile && !profile.onboardingComplete)) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#FAFAF9',
        }}
        role="status"
        aria-label="Loading"
      >
        <span style={{ fontSize: 14, color: '#78716C' }}>Loading…</span>
      </div>
    );
  }

  return (
    <>
      {children}
      <TutorialOverlay isOpen={isOpen} onComplete={completeTutorial} onSkip={skipTutorial} />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGuard>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar />
          <main
            id="main-content"
            tabIndex={-1}
            style={{ flex: 1, padding: 32, overflowY: 'auto' }}
          >
            {children}
          </main>
        </div>
      </div>
    </OnboardingGuard>
  );
}
