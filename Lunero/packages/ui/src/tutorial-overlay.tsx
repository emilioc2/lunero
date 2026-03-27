'use client';

import React, { useEffect, useCallback } from 'react';

export interface TutorialOverlayProps {
  isOpen: boolean;
  /** Called when the user completes the final step — marks tutorialComplete in the profile. */
  onComplete: () => void;
  /** Called when the user explicitly skips — also marks tutorialComplete so it doesn't re-appear. */
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
}

// Ordered tutorial steps introducing Lunero's core concepts.
// Keep these in sync with the onboarding flow so messaging stays consistent.
const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Lunero',
    description:
      "Lunero is built around a simple idea: a FlowSheet. Each FlowSheet covers a period — weekly, monthly, or custom — and tracks everything that flows in and out. At the end of each period, it archives automatically and a fresh one begins.",
  },
  {
    title: 'Your Dashboard',
    description:
      "The dashboard shows your Available Balance front and centre: Total Income minus Expenses and Savings. Below it you'll find a breakdown by type and a full list of entries for the current period.",
  },
  {
    title: 'Adding Entries',
    description:
      'Tap "Add Entry" to capture income, an expense, or a saving. Give it an amount, pick a category, and optionally add a note. Entries update your Available Balance instantly.',
  },
  {
    title: 'Calendar View',
    description:
      'The Calendar View shows every day of your FlowSheet period. Days with entries are highlighted by their dominant entry type. Tap any day to see its entries or add a new one.',
  },
  {
    title: 'Mira, your AI coach',
    description:
      'Mira understands your finances in plain language. Ask things like "How much did I spend on food this month?" or "Am I on track?" Mira also sends proactive alerts when your balance is heading negative.',
  },
  {
    title: "You're all set!",
    description:
      "That's everything you need to get started. Your FlowSheet is ready — go ahead and add your first entry. You can always re-launch this tutorial from Settings → Help.",
  },
];

// Derived constant so step-boundary checks don't need to reference STEPS.length directly.
const TOTAL_STEPS = STEPS.length;

export function TutorialOverlay({ isOpen, onComplete, onSkip }: TutorialOverlayProps) {
  const [step, setStep] = React.useState(0);

  // Reset to first step whenever the overlay opens so re-launches always start fresh.
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Keyboard navigation: Escape skips, arrow keys move between steps.
  // Wrapped in useCallback so the effect dependency stays stable across renders.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        // Clamp at last step — don't advance past the end without an explicit "Get started" click.
        setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        // Clamp at 0 — can't go before the first step.
        setStep((s) => Math.max(s - 1, 0));
      }
    },
    [isOpen, onSkip],
  );

  // Attach/detach the keyboard listener whenever handleKeyDown identity changes.
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Render nothing when closed — avoids keeping the DOM node in the tree.
  if (!isOpen) return null;

  const current = STEPS[step];
  if (!current) return null;
  // Controls whether the primary CTA reads "Next" or "Get started" and triggers onComplete.
  const isLast = step === TOTAL_STEPS - 1;

  return (
    // role="dialog" + aria-modal tells screen readers to restrict focus to this overlay.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App tutorial"
      style={backdropStyle}
    >
      <div style={cardStyle}>
        {/* Screen-reader-accessible progress label; the dot row below is aria-hidden. */}
        <p style={progressStyle} aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          {step + 1} of {TOTAL_STEPS}
        </p>

        {/* Visual progress dots — hidden from assistive tech since the <p> above covers it. */}
        <div style={dotsContainerStyle} aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} style={dotStyle(i === step)} />
          ))}
        </div>

        {/* Step content */}
        <h2 style={titleStyle}>{current.title}</h2>
        <p style={descriptionStyle}>{current.description}</p>

        {/* Navigation row: skip (left-aligned) and prev/next (right-aligned). */}
        <div style={navRowStyle}>
          <button
            type="button"
            onClick={onSkip}
            style={skipButtonStyle}
            aria-label="Skip tutorial"
          >
            Skip tutorial
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Previous button is hidden on the first step — nothing to go back to. */}
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                style={secondaryButtonStyle}
                aria-label="Previous step"
              >
                Previous
              </button>
            )}
            {/* On the last step, clicking fires onComplete instead of advancing. */}
            <button
              type="button"
              onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
              style={primaryButtonStyle}
              aria-label={isLast ? 'Finish tutorial' : 'Next step'}
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Inline styles keep this component self-contained and portable across the
// shared packages/ui library without requiring a CSS import.

// Semi-transparent dark backdrop; zIndex 9999 ensures it sits above all app chrome.
const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(28, 25, 23, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FAFAF9',
  borderRadius: 16,
  padding: 36,
  maxWidth: 480,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxShadow: '0 8px 32px rgba(28, 25, 23, 0.18)',
};

// Muted uppercase label — matches the editorial typographic style used across Lunero.
const progressStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#A8A29E',
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const dotsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
};

// Active dot expands horizontally (pill shape) to indicate the current step.
// CSS transitions on width and color provide a smooth visual cue without JS animation.
const dotStyle = (active: boolean): React.CSSProperties => ({
  width: active ? 20 : 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: active ? '#44403C' : '#D6D3D1',
  transition: 'width 0.2s, background-color 0.2s',
});

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: '#1C1917',
  margin: 0,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: '#44403C',
  margin: 0,
};

const navRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 8,
};

// Subtle text-only button — intentionally de-emphasised so users focus on Next/Get started.
const skipButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 13,
  color: '#A8A29E',
  cursor: 'pointer',
  padding: '8px 0',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  backgroundColor: '#FFFFFF',
  color: '#44403C',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

// Primary CTA uses the brand's warm dark tone (#44403C) from the Lunero design system.
const primaryButtonStyle: React.CSSProperties = {
  padding: '9px 20px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#44403C',
  color: '#FAFAF9',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};
