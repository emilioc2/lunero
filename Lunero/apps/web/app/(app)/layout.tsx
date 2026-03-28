'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useProfile } from '../../lib/hooks/use-profile';
import { useThemeStore } from '../../lib/store/theme-store';
import { useTutorial } from '../../lib/hooks/use-tutorial';
import { TutorialOverlay, TopTabBar, MiraFAB, MiraPopup } from '@lunero/ui';
import type { MiraMessage, EntryFormValues } from '@lunero/ui';
import type { Entry } from '@lunero/core';
import { useMiraQuery } from '../../lib/hooks/use-mira';
import { useActiveFlowSheet } from '../../lib/hooks/use-flow-sheets';
import { useCreateEntry } from '../../lib/hooks/use-entries';
import { useCategories } from '../../lib/hooks/use-categories';
import { useEntryStore } from '../../lib/store/entry-store';
import { EntryModal } from '../../components/dashboard/entry-modal';
import { SUPPORTED_CURRENCIES } from '../../components/onboarding/step-currency';
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
          backgroundColor: 'var(--background, #FAFAF9)',
        }}
        role="status"
        aria-label="Loading"
      >
        <span style={{ fontSize: 14, color: 'var(--placeholderColor, #78716C)' }}>Loading…</span>
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
  const pathname = usePathname();
  const router = useRouter();
  const [showEntryModal, setShowEntryModal] = useState(false);

  // Data needed for entry creation via "+ Add New"
  const { data: flowSheet } = useActiveFlowSheet();
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const createEntry = useCreateEntry();
  const { addEntry, setEntries } = useEntryStore();
  const defaultCurrency = profile?.defaultCurrency ?? 'USD';

  const handleEntrySubmit = async (values: EntryFormValues) => {
    if (!flowSheet) return;
    const dto = {
      flowSheetId: flowSheet.id,
      entryType: values.entryType,
      category: values.categoryId,
      amount: parseFloat(values.amount),
      currency: values.currency,
      entryDate: values.entryDate,
      note: values.note || undefined,
      clientUpdatedAt: new Date().toISOString(),
    };

    const optimistic: Entry = {
      ...dto,
      categoryId: values.categoryId,
      id: `optimistic-${Date.now()}`,
      userId: '',
      convertedAmount: undefined,
      conversionRate: undefined,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addEntry(optimistic);
    setShowEntryModal(false);

    try {
      await createEntry.mutateAsync(dto);
    } catch {
      // Rollback handled by React Query invalidation
    }
  };

  // Mira popup state
  const [miraOpen, setMiraOpen] = useState(false);
  const [miraMinimized, setMiraMinimized] = useState(false);
  const [miraMessages, setMiraMessages] = useState<MiraMessage[]>([]);
  const miraQuery = useMiraQuery();

  const handleMiraSend = (text: string) => {
    const userMsg: MiraMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMiraMessages((prev) => [...prev, userMsg]);
    miraQuery.mutate(
      { message: text },
      {
        onSuccess: (data) => {
          const miraMsg: MiraMessage = {
            id: `m-${Date.now()}`,
            role: 'mira',
            content: typeof data === 'string' ? data : (data as { response?: string }).response ?? 'Sorry, I couldn\'t process that.',
          };
          setMiraMessages((prev) => [...prev, miraMsg]);
        },
        onError: () => {
          const errMsg: MiraMessage = {
            id: `m-${Date.now()}`,
            role: 'mira',
            content: 'Something went wrong. Please try again.',
          };
          setMiraMessages((prev) => [...prev, errMsg]);
        },
      },
    );
  };

  const handleMiraClose = () => {
    setMiraOpen(false);
    setMiraMinimized(false);
    setMiraMessages([]);
  };

  return (
    <OnboardingGuard>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
        <TopTabBar
          activePath={pathname}
          onNavigate={(path) => router.push(path)}
          onAddNew={() => setShowEntryModal(true)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            padding: '24px 16px',
            overflowY: 'auto',
            maxWidth: 720,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {children}
        </main>

        <MiraFAB isPopupOpen={miraOpen} onPress={() => setMiraOpen(true)} />
        <MiraPopup
          isOpen={miraOpen}
          isMinimized={miraMinimized}
          messages={miraMessages}
          isQuerying={miraQuery.isPending}
          onSendMessage={handleMiraSend}
          onMinimize={() => setMiraMinimized(true)}
          onClose={handleMiraClose}
          onRestore={() => setMiraMinimized(false)}
        />

        {showEntryModal && flowSheet && (
          <EntryModal
            mode="create"
            categories={categories}
            defaultCurrency={defaultCurrency}
            supportedCurrencies={SUPPORTED_CURRENCIES}
            onSubmit={handleEntrySubmit}
            onClose={() => setShowEntryModal(false)}
            isSubmitting={createEntry.isPending}
          />
        )}
      </div>
    </OnboardingGuard>
  );
}
