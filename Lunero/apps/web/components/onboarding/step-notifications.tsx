'use client';

import React, { useState } from 'react';
import { OnboardingStep } from '@lunero/ui';
import { requestNotificationPermission } from '../../lib/push-notifications';

interface Props {
  value: boolean;
  onNext: (value: boolean) => void;
  onBack: () => void;
}

export function StepNotifications({ value, onNext, onBack }: Props) {
  const [enabled, setEnabled] = useState<boolean>(value ?? true);

  async function handleContinue() {
    if (enabled) {
      // Request browser permission and subscribe — non-blocking; proceed regardless of outcome
      await requestNotificationPermission();
    }
    onNext(enabled);
  }

  return (
    <OnboardingStep
      currentStep={5}
      totalSteps={6}
      title="Overspend alerts"
      description="Get notified when your available balance goes negative. You can change this in settings."
      onBack={onBack}
    >
      <div
        role="radiogroup"
        aria-label="Overspend alert preference"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <button
          type="button"
          role="radio"
          aria-checked={enabled}
          onClick={() => setEnabled(true)}
          style={optionStyle(enabled)}
        >
          <span style={{ fontSize: 20, marginRight: 12 }} aria-hidden="true">🔔</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: enabled ? 600 : 400, fontSize: 15, color: '#1C1917' }}>
              Yes, notify me
            </span>
            <span style={{ fontSize: 13, color: '#78716C', marginTop: 2 }}>
              Alert me when my balance goes negative
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={!enabled}
          onClick={() => setEnabled(false)}
          style={optionStyle(!enabled)}
        >
          <span style={{ fontSize: 20, marginRight: 12 }} aria-hidden="true">🔕</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: !enabled ? 600 : 400, fontSize: 15, color: '#1C1917' }}>
              No thanks
            </span>
            <span style={{ fontSize: 13, color: '#78716C', marginTop: 2 }}>
              I'll check my balance manually
            </span>
          </span>
        </button>
      </div>

      <button type="button" onClick={handleContinue} style={primaryButtonStyle}>
        Continue
      </button>
    </OnboardingStep>
  );
}

const optionStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
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
