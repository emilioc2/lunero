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
  emoji: string;
  description: string;
  bullets?: string[];
}

/** Step emojis displayed centered above the title. */
export const STEP_EMOJIS = ['✨', '📊', '🤙', '📅', '💫', '🎉'];

/**
 * Ordered tutorial steps with emoji-suffixed titles, description paragraphs,
 * and optional checkmark bullet lists per the redesign spec.
 */
export const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Lunero! 🌙',
    emoji: STEP_EMOJIS[0],
    description:
      "Lunero is built around a simple idea: a FlowSheet. Each FlowSheet covers a period — weekly, monthly, or custom — and tracks everything that flows in and out. At the end of each period, it archives automatically and a fresh one begins.",
  },
  {
    title: 'Understanding FlowSheets 📊',
    emoji: STEP_EMOJIS[1],
    description:
      'FlowSheets are the heart of Lunero. Each one is a budget period that helps you stay on track.',
    bullets: [
      'Set projected income and expenses',
      'Track actual spending automatically',
      'Compare budget vs reality in real-time',
      'View past FlowSheets for insights',
    ],
  },
  {
    title: 'Managing Transactions 🤙',
    emoji: STEP_EMOJIS[2],
    description: 'Every entry you add falls into one of three types:',
    bullets: [
      'Income: Salary, freelance work, gifts',
      'Expenses: Daily spending across categories',
      'Savings: Money set aside for goals',
    ],
  },
  {
    title: 'Calendar View 📅',
    emoji: STEP_EMOJIS[3],
    description: 'The Calendar View shows every day of your FlowSheet period at a glance.',
    bullets: [
      'Green highlights = positive cash flow',
      'Red highlights = more expenses than income',
      'Dots show transaction types',
      'Click any day for details',
    ],
  },
  {
    title: 'Meet Mira, Your AI Coach 💫',
    emoji: STEP_EMOJIS[4],
    description:
      'Mira understands your finances in plain language and helps you make smarter decisions.',
    bullets: [
      'Get spending insights and trends',
      'Receive budget recommendations',
      'Ask questions about your finances',
      'Set and track financial goals',
    ],
  },
  {
    title: "You're All Set! 🎉",
    emoji: STEP_EMOJIS[5],
    description:
      "That's everything you need to get started. Your FlowSheet is ready — go ahead and add your first entry. You can always re-launch this tutorial from Settings → Help.",
  },
];

export const TOTAL_STEPS = STEPS.length;

export function TutorialOverlay({ isOpen, onComplete, onSkip }: TutorialOverlayProps) {
  const [step, setStep] = React.useState(0);

  // Reset to first step whenever the overlay opens so re-launches always start fresh.
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Keyboard navigation: Escape skips, arrow keys move between steps.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setStep((s) => Math.max(s - 1, 0));
      }
    },
    [isOpen, onSkip],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const current = STEPS[step];
  if (!current) return null;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App tutorial"
      style={backdropStyle}
    >
      <div style={cardStyle}>
        {/* Segmented Progress Bar + Close button row */}
        <div style={segmentedBarContainerStyle}>
          <div style={segmentedBarStyle} aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                data-testid={`progress-segment-${i}`}
                style={segmentStyle(i < step + 1)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSkip}
            style={closeButtonStyle}
            aria-label="Close tutorial"
            data-testid="tutorial-close-button"
          >
            ×
          </button>
        </div>

        {/* Screen-reader-only progress label */}
        <p style={srOnlyStyle} aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          Step {step + 1} of {TOTAL_STEPS}
        </p>

        {/* Centered emoji icon */}
        <div style={emojiStyle} data-testid={`step-emoji-${step}`} aria-hidden="true">
          {current.emoji}
        </div>

        {/* Step title */}
        <h2 style={titleStyle}>{current.title}</h2>

        {/* Description paragraph */}
        <p style={descriptionStyle}>{current.description}</p>

        {/* Checkmark bullet list (steps 2–5 only) */}
        {current.bullets && current.bullets.length > 0 && (
          <ul style={bulletListStyle}>
            {current.bullets.map((bullet, i) => (
              <li key={i} style={bulletItemStyle}>
                <span style={checkmarkStyle} aria-hidden="true">✓</span>
                {bullet}
              </li>
            ))}
          </ul>
        )}

        {/* Navigation row */}
        <div style={navRowStyle}>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              style={previousLinkStyle}
              aria-label="Previous step"
            >
              Previous
            </button>
          ) : (
            <span />
          )}

          <span style={stepCounterStyle}>
            {step + 1} of {TOTAL_STEPS}
          </span>

          <button
            type="button"
            onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
            style={primaryButtonStyle}
            aria-label={isLast ? 'Finish tutorial' : 'Next step'}
          >
            {isLast ? 'Get Started 🚀' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Inline styles keep this component self-contained and portable across the
// shared packages/ui library without requiring a CSS import.

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
  backgroundColor: 'var(--surface1, #FAFAF9)',
  borderRadius: 16,
  padding: 36,
  maxWidth: 480,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxShadow: '0 8px 32px rgba(28, 25, 23, 0.18)',
  position: 'relative',
};

const segmentedBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const segmentedBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  flex: 1,
};

/** Filled segments use brand dark, empty use muted — adapts via CSS custom properties. */
const segmentStyle = (filled: boolean): React.CSSProperties => ({
  flex: 1,
  height: 4,
  borderRadius: 2,
  backgroundColor: filled ? 'var(--color, #44403C)' : 'var(--borderColor, #D6D3D1)',
  transition: 'background-color 0.2s',
});

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 14,
  color: 'var(--placeholderColor, #A8A29E)',
  cursor: 'pointer',
  padding: '2px 4px',
  lineHeight: 1,
  flexShrink: 0,
};

/** Visually hidden but accessible to screen readers. */
const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

const emojiStyle: React.CSSProperties = {
  fontSize: 32,
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: 'var(--color, #1C1917)',
  margin: 0,
  textAlign: 'center',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: 'var(--color, #44403C)',
  margin: 0,
};

const bulletListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const bulletItemStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color, #44403C)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
};

/** Checkmark prefix in Clay Red accent. */
const checkmarkStyle: React.CSSProperties = {
  color: '#C86D5A',
  fontWeight: 600,
  flexShrink: 0,
};

const navRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 8,
};

const previousLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 13,
  color: 'var(--placeholderColor, #A8A29E)',
  cursor: 'pointer',
  padding: '8px 0',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

const stepCounterStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--placeholderColor, #A8A29E)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '9px 20px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: 'var(--color, #44403C)',
  color: 'var(--background, #FAFAF9)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};
