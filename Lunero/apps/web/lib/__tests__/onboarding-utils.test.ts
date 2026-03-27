import { describe, it, expect } from 'vitest';
import { resolveOnboardingStep, needsOnboarding, ONBOARDING_TOTAL_STEPS } from '../onboarding-utils';

describe('resolveOnboardingStep', () => {
  it('returns step 1 for a brand-new user with onboardingStep 0', () => {
    expect(resolveOnboardingStep({ onboardingComplete: false, onboardingStep: 0 })).toBe(1);
  });

  it('returns step 1 when onboardingStep is missing/undefined', () => {
    expect(
      resolveOnboardingStep({ onboardingComplete: false, onboardingStep: undefined as unknown as number })
    ).toBe(1);
  });

  it('resumes from the saved step', () => {
    expect(resolveOnboardingStep({ onboardingComplete: false, onboardingStep: 3 })).toBe(3);
  });

  it('clamps step above total to ONBOARDING_TOTAL_STEPS', () => {
    expect(resolveOnboardingStep({ onboardingComplete: false, onboardingStep: 99 })).toBe(ONBOARDING_TOTAL_STEPS);
  });

  it('clamps negative step to 1', () => {
    expect(resolveOnboardingStep({ onboardingComplete: false, onboardingStep: -5 })).toBe(1);
  });

  it('returns ONBOARDING_TOTAL_STEPS when onboarding is already complete', () => {
    expect(resolveOnboardingStep({ onboardingComplete: true, onboardingStep: 2 })).toBe(ONBOARDING_TOTAL_STEPS);
  });

  it('returns ONBOARDING_TOTAL_STEPS when complete regardless of saved step', () => {
    expect(resolveOnboardingStep({ onboardingComplete: true, onboardingStep: 0 })).toBe(ONBOARDING_TOTAL_STEPS);
  });
});

describe('needsOnboarding', () => {
  it('returns true when onboardingComplete is false', () => {
    expect(needsOnboarding({ onboardingComplete: false })).toBe(true);
  });

  it('returns false when onboardingComplete is true', () => {
    expect(needsOnboarding({ onboardingComplete: true })).toBe(false);
  });
});

describe('ONBOARDING_TOTAL_STEPS', () => {
  it('is 6', () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(6);
  });
});
