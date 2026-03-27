'use client';

import React, { useState } from 'react';
import { OnboardingStep } from '@lunero/ui';
import type { PeriodType } from '@lunero/core';

const PERIOD_OPTIONS: { value: PeriodType; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Reset every Sunday' },
  { value: 'monthly', label: 'Monthly', description: 'Reset on the 1st of each month' },
  { value: 'custom', label: 'Custom', description: 'You choose the start and end dates' },
];

interface Props {
  value: PeriodType;
  onNext: (value: PeriodType) => void;
  onBack: () => void;
}

export function StepPeriod({ value, onNext, onBack }: Props) {
  const [period, setPeriod] = useState<PeriodType>(value || 'monthly');

  return (
    <OnboardingStep
      currentStep={3}
      totalSteps={6}
      title="How do you like to budget?"
      description="Choose how often your FlowSheet resets. Monthly is the most popular choice."
      onBack={onBack}
    >
      <div
        role="radiogroup"
        aria-label="FlowSheet period preference"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {PERIOD_OPTIONS.map((opt) => {
          const selected = period === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPeriod(opt.value)}
              style={optionStyle(selected)}
            >
              <span style={{ fontWeight: selected ? 600 : 400, fontSize: 15, color: '#1C1917' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 13, color: '#78716C', marginTop: 2 }}>
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => onNext(period)} style={primaryButtonStyle}>
        Continue
      </button>
    </OnboardingStep>
  );
}

const optionStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '12px 16px',
  borderRadius: 10,
  border: `1.5px solid ${selected ? '#44403C' : '#D6D3D1'}`,
  backgroundColor: selected ? '#F5F5F4' : '#FFFFFF',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s',
});

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#44403C',
  color: '#FAFAF9',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  alignSelf: 'flex-start',
};
