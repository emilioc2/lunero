import type { UserProfile } from '@lunero/core';

// Total number of onboarding steps — update this if steps are added or removed.
export const ONBOARDING_TOTAL_STEPS = 6;

/**
 * Determines which step to resume from based on the saved profile.
 * Clamps to valid range [1, ONBOARDING_TOTAL_STEPS].
 *
 * If onboarding is already complete, returns the final step so the UI
 * can treat the flow as finished without re-entering it.
 */
export function resolveOnboardingStep(
  profile: Pick<UserProfile, 'onboardingComplete' | 'onboardingStep'>
): number {
  // Short-circuit: already done, no need to compute a step.
  if (profile.onboardingComplete) return ONBOARDING_TOTAL_STEPS;

  // `onboardingStep` may be 0 (new user default) — treat that as step 1.
  // Math.max/min clamps the value so it never falls outside the valid step range,
  // guarding against stale or corrupted profile data from the backend.
  return Math.max(1, Math.min(profile.onboardingStep || 1, ONBOARDING_TOTAL_STEPS));
}

/**
 * Returns true if the profile indicates onboarding is not yet complete.
 * Used by middleware and route guards to redirect new users to /onboarding.
 */
export function needsOnboarding(profile: Pick<UserProfile, 'onboardingComplete'>): boolean {
  return !profile.onboardingComplete;
}
