'use client';

import React, { useState } from 'react';
import { OnboardingStep } from '@lunero/ui';
import type { ThemePreference } from '@lunero/core';
import { useThemeStore } from '../../lib/store/theme-store';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; icon: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use the light theme', icon: '☀️' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme', icon: '🌙' },
  { value: 'system', label: 'System', description: 'Match your device setting', icon: '⚙️' },
];

interface Props {
  value: ThemePreference;
  onNext: (value: ThemePreference) => void;
  onBack: () => void;
}

export function StepTheme({ value, onNext, onBack }: Props) {
  const [theme, setTheme] = useState<ThemePreference>(value || 'system');
  const setPreference = useThemeStore((s: { setPreference: (pref: ThemePreference) => void }) => s.setPreference);

  function handleSelect(t: ThemePreference) {
    setTheme(t);
    // Apply immediately so the user sees the effect right away
    setPreference(t);
  }

  return (
    <OnboardingStep
      currentStep={4}
      totalSteps={6}
      title="Choose your theme"
      description="You can change this at any time from settings."
      onBack={onBack}
    >
      <div
        role="radiogroup"
        aria-label="Theme preference"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {THEME_OPTIONS.map((opt) => {
          const selected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(opt.value)}
              style={optionStyle(selected)}
            >
              <span style={{ fontSize: 20, marginRight: 12 }} aria-hidden="true">
                {opt.icon}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: selected ? 600 : 400, fontSize: 15, color: '#1C1917' }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: 13, color: '#78716C', marginTop: 2 }}>
                  {opt.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => onNext(theme)} style={primaryButtonStyle}>
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
