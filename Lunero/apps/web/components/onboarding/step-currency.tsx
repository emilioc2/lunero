'use client';

import React, { useState } from 'react';
import { OnboardingStep } from '@lunero/ui';

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'AED', 'SAR',
  'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'TRY', 'PLN', 'CZK', 'HUF', 'RON',
  'ILS', 'CLP', 'COP', 'PEN', 'ARS',
];

interface Props {
  value: string;
  onNext: (value: string) => void;
  onBack: () => void;
}

export function StepCurrency({ value, onNext, onBack }: Props) {
  const [currency, setCurrency] = useState(value || 'USD');

  return (
    <OnboardingStep
      currentStep={2}
      totalSteps={6}
      title="Your default currency"
      description="All entries will default to this currency. You can still log entries in other currencies."
      onBack={onBack}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          htmlFor="default-currency"
          style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}
        >
          Currency
        </label>
        <select
          id="default-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={selectStyle}
          aria-label="Select your default currency"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={() => onNext(currency)} style={primaryButtonStyle}>
        Continue
      </button>
    </OnboardingStep>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  backgroundColor: '#FFFFFF',
  fontSize: 15,
  color: '#1C1917',
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

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
