'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PeriodType, ThemePreference } from '@lunero/core';
import { useProfile, useUpdateProfile } from '../../../lib/hooks/use-profile';
import { resolveOnboardingStep } from '../../../lib/onboarding-utils';
import { StepDisplayName } from '../../../components/onboarding/step-display-name';
import { StepCurrency } from '../../../components/onboarding/step-currency';
import { StepPeriod } from '../../../components/onboarding/step-period';
import { StepTheme } from '../../../components/onboarding/step-theme';
import { StepNotifications } from '../../../components/onboarding/step-notifications';
import { StepBudgetSetup } from '../../../components/onboarding/step-budget-setup';

interface WizardState {
  displayName: string;
  defaultCurrency: string;
  flowsheetPeriod: PeriodType;
  themePreference: ThemePreference;
  overspendAlerts: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // Current step (1-6); initialised from profile.onboardingStep once loaded
  const [step, setStep] = useState<number | null>(null);

  const [wizard, setWizard] = useState<WizardState>({
    displayName: '',
    defaultCurrency: 'USD',
    flowsheetPeriod: 'monthly',
    themePreference: 'system',
    overspendAlerts: true,
  });

  // Initialise step and prefill from profile on first load
  useEffect(() => {
    if (!profile) return;

    // If already complete, send to main app
    if (profile.onboardingComplete) {
      router.replace('/');
      return;
    }

    // Resume from last saved step (clamp to 1–6)
    const resumeStep = resolveOnboardingStep(profile);
    setStep(resumeStep);

    setWizard({
      displayName: profile.displayName ?? '',
      defaultCurrency: profile.defaultCurrency ?? 'USD',
      flowsheetPeriod: profile.flowsheetPeriod ?? 'monthly',
      themePreference: profile.themePreference ?? 'system',
      overspendAlerts: profile.overspendAlerts ?? true,
    });
  }, [profile, router]);

  // Persist current step to backend whenever it changes (18.11)
  async function advanceTo(nextStep: number) {
    setStep(nextStep);
    await updateProfile.mutateAsync({ onboardingStep: nextStep });
  }

  // ── Step handlers ──────────────────────────────────────────────────────────

  async function handleDisplayName(displayName: string) {
    setWizard((w) => ({ ...w, displayName }));
    setStep(2);
    await updateProfile.mutateAsync({ displayName, onboardingStep: 2 });
  }

  async function handleCurrency(defaultCurrency: string) {
    setWizard((w) => ({ ...w, defaultCurrency }));
    setStep(3);
    await updateProfile.mutateAsync({ defaultCurrency, onboardingStep: 3 });
  }

  async function handlePeriod(flowsheetPeriod: PeriodType) {
    setWizard((w) => ({ ...w, flowsheetPeriod }));
    setStep(4);
    await updateProfile.mutateAsync({ flowsheetPeriod, onboardingStep: 4 });
  }

  async function handleTheme(themePreference: ThemePreference) {
    setWizard((w) => ({ ...w, themePreference }));
    setStep(5);
    await updateProfile.mutateAsync({ themePreference, onboardingStep: 5 });
  }

  async function handleNotifications(overspendAlerts: boolean) {
    setWizard((w) => ({ ...w, overspendAlerts }));
    setStep(6);
    await updateProfile.mutateAsync({ overspendAlerts, onboardingStep: 6 });
  }

  async function handleComplete() {
    // Save all preferences and mark onboarding complete (18.12)
    await updateProfile.mutateAsync({
      displayName: wizard.displayName,
      defaultCurrency: wizard.defaultCurrency,
      flowsheetPeriod: wizard.flowsheetPeriod,
      themePreference: wizard.themePreference,
      overspendAlerts: wizard.overspendAlerts,
      onboardingComplete: true,
      onboardingStep: 6,
    });
    router.replace('/');
  }

  // ── Loading / guard states ─────────────────────────────────────────────────

  if (isLoading || step === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
        aria-label="Loading onboarding"
        role="status"
      >
        <span style={{ fontSize: 14, color: '#78716C' }}>Loading…</span>
      </div>
    );
  }

  // ── Render active step ─────────────────────────────────────────────────────

  switch (step) {
    case 1:
      return <StepDisplayName value={wizard.displayName} onNext={handleDisplayName} />;

    case 2:
      return (
        <StepCurrency
          value={wizard.defaultCurrency}
          onNext={handleCurrency}
          onBack={() => advanceTo(1)}
        />
      );

    case 3:
      return (
        <StepPeriod
          value={wizard.flowsheetPeriod}
          onNext={handlePeriod}
          onBack={() => advanceTo(2)}
        />
      );

    case 4:
      return (
        <StepTheme
          value={wizard.themePreference}
          onNext={handleTheme}
          onBack={() => advanceTo(3)}
        />
      );

    case 5:
      return (
        <StepNotifications
          value={wizard.overspendAlerts}
          onNext={handleNotifications}
          onBack={() => advanceTo(4)}
        />
      );

    case 6:
      return (
        <StepBudgetSetup
          defaultCurrency={wizard.defaultCurrency}
          onComplete={handleComplete}
          onBack={() => advanceTo(5)}
        />
      );

    default:
      return null;
  }
}
