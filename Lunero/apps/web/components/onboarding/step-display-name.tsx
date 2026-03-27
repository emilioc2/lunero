'use client';

import React, { useState } from 'react';
import { OnboardingStep } from '@lunero/ui';

interface Props {
  value: string;
  onNext: (value: string) => void;
}

export function StepDisplayName({ value, onNext }: Props) {
  const [name, setName] = useState(value);
  const [error, setError] = useState('');

  function handleNext() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your display name.');
      return;
    }
    setError('');
    onNext(trimmed);
  }

  return (
    <OnboardingStep
      currentStep={1}
      totalSteps={6}
      title="What should we call you?"
      description="This name will appear throughout the app. You can change it anytime in settings."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          htmlFor="display-name"
          style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}
        >
          Display Name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          placeholder="Kevin"
          maxLength={100}
          autoFocus
          aria-describedby={error ? 'display-name-error' : undefined}
          aria-invalid={!!error}
          style={inputStyle(!!error)}
        />
        {error && (
          <span id="display-name-error" role="alert" style={{ fontSize: 12, color: '#C86D5A' }}>
            {error}
          </span>
        )}
      </div>

      <button type="button" onClick={handleNext} style={primaryButtonStyle}>
        Continue
      </button>
    </OnboardingStep>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1.5px solid ${hasError ? '#C86D5A' : '#D6D3D1'}`,
  backgroundColor: '#FFFFFF',
  fontSize: 15,
  color: '#1C1917',
  outline: 'none',
  boxSizing: 'border-box',
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
