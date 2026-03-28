'use client';

import React, { useState } from 'react';
import { OnboardingStep } from '@lunero/ui';
import { EntryForm, type EntryFormValues } from '@lunero/ui';
import { useCategories } from '../../lib/hooks/use-categories';
import { useActiveFlowSheet } from '../../lib/hooks/use-flow-sheets';
import { useMiraQuery } from '../../lib/hooks/use-mira';
import { entryApi } from '@lunero/api-client';

type BudgetPath = 'choose' | 'manual' | 'mira';
type ManualSubStep = 'income' | 'expense' | 'savings';

interface Props {
  defaultCurrency: string;
  onComplete: () => void;
  onBack: () => void;
}

export function StepBudgetSetup({ defaultCurrency, onComplete, onBack }: Props) {
  const [path, setPath] = useState<BudgetPath>('choose');
  const [manualSubStep, setManualSubStep] = useState<ManualSubStep>('income');
  const [completedSubSteps, setCompletedSubSteps] = useState<Set<ManualSubStep>>(new Set());

  // Mira state
  const [miraMessage, setMiraMessage] = useState('');
  const [miraResponse, setMiraResponse] = useState('');
  const [miraConfirmed, setMiraConfirmed] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: activeFlowSheet } = useActiveFlowSheet();
  const miraQuery = useMiraQuery();

  const flowSheetId = activeFlowSheet?.id ?? '';

  // ── Manual path handlers ──────────────────────────────────────────────────

  async function handleEntrySubmit(values: EntryFormValues) {
    if (!flowSheetId) return;
    await entryApi.create({
      flowSheetId,
      entryType: values.entryType,
      category: values.categoryId,
      amount: parseFloat(values.amount),
      currency: values.currency,
      entryDate: values.entryDate,
      note: values.note || undefined,
      clientUpdatedAt: new Date().toISOString(),
    });
    setCompletedSubSteps((prev) => new Set([...prev, manualSubStep]));
    if (manualSubStep === 'income') setManualSubStep('expense');
    else if (manualSubStep === 'expense') setManualSubStep('savings');
    else onComplete();
  }

  function handleSkipSavings() {
    onComplete();
  }

  // ── Mira path handlers ────────────────────────────────────────────────────

  async function handleMiraSubmit() {
    if (!miraMessage.trim()) return;
    const contextualMessage = `I'm setting up my budget for the first time. ${miraMessage.trim()}`;
    const result = await miraQuery.mutateAsync({ message: contextualMessage });
    setMiraResponse(result.response);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (path === 'choose') {
    return (
      <OnboardingStep
        currentStep={6}
        totalSteps={6}
        title="Set up your first budget"
        description="Add some initial entries to get started. You can always add more later."
        onBack={onBack}
        onSkip={onComplete}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" onClick={() => setPath('manual')} style={pathButtonStyle('#6B6F69')}>
            <span style={{ fontSize: 22, marginBottom: 6 }} aria-hidden="true">✏️</span>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1C1917' }}>Manual setup</span>
            <span style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
              Add income, expenses, and savings entries step by step
            </span>
          </button>

          <button type="button" onClick={() => setPath('mira')} style={pathButtonStyle('#C4A484')}>
            <span style={{ fontSize: 22, marginBottom: 6 }} aria-hidden="true">✨</span>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1C1917' }}>Set up with Mira</span>
            <span style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
              Describe your finances in plain language and Mira will set things up for you
            </span>
          </button>
        </div>

        <button type="button" onClick={onComplete} style={skipLinkStyle}>
          Skip for now — I'll set up my budget later
        </button>
      </OnboardingStep>
    );
  }

  if (path === 'manual') {
    const subStepConfig: Record<ManualSubStep, { title: string; hint: string }> = {
      income: {
        title: 'Add your income',
        hint: 'Start with your main source of income — salary, freelance, or anything you earn.',
      },
      expense: {
        title: 'Add an expense',
        hint: 'Add a regular expense like rent, groceries, or subscriptions.',
      },
      savings: {
        title: 'Add a savings goal (optional)',
        hint: 'Track money you set aside — emergency fund, holiday savings, or anything else.',
      },
    };

    const config = subStepConfig[manualSubStep];
    const filteredCategories = categories.filter((c) => c.entryType === manualSubStep);

    return (
      <OnboardingStep
        currentStep={6}
        totalSteps={6}
        title={config.title}
        description={config.hint}
        onBack={() => {
          if (manualSubStep === 'income') setPath('choose');
          else if (manualSubStep === 'expense') setManualSubStep('income');
          else setManualSubStep('expense');
        }}
        onSkip={manualSubStep === 'savings' ? handleSkipSavings : undefined}
      >
        <SwitchPathLink current="manual" onSwitch={() => setPath('mira')} />

        {!flowSheetId ? (
          <p style={{ fontSize: 14, color: '#78716C' }}>
            Loading your FlowSheet…
          </p>
        ) : (
          <EntryForm
            initialValues={{ entryType: manualSubStep, currency: defaultCurrency }}
            categories={filteredCategories}
            defaultCurrency={defaultCurrency}
            onSubmit={handleEntrySubmit}
            onCancel={() => setPath('choose')}
          />
        )}
      </OnboardingStep>
    );
  }

  // Mira path
  return (
    <OnboardingStep
      currentStep={6}
      totalSteps={6}
      title="Tell Mira about your finances"
      description='Describe your income and expenses in plain language. For example: "I earn $3000/month, spend $800 on rent and $400 on groceries."'
      onBack={() => setPath('choose')}
      onSkip={onComplete}
    >
      <SwitchPathLink current="mira" onSwitch={() => setPath('manual')} />

      {!miraConfirmed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={miraMessage}
            onChange={(e) => setMiraMessage(e.target.value)}
            placeholder="e.g. I earn $3000/month, I spend $800 on rent and $400 on groceries…"
            rows={4}
            aria-label="Describe your finances to Mira"
            style={textareaStyle}
          />

          {miraResponse && (
            <div style={miraResponseStyle}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#44403C', marginBottom: 8 }}>
                Mira's response
              </p>
              <p style={{ fontSize: 14, color: '#57534E', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {miraResponse}
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setMiraConfirmed(true); onComplete(); }}
                  style={primaryButtonStyle}
                >
                  Looks good — continue
                </button>
                <button
                  type="button"
                  onClick={() => { setMiraResponse(''); setMiraMessage(''); }}
                  style={secondaryButtonStyle}
                >
                  Start over
                </button>
              </div>
            </div>
          )}

          {!miraResponse && (
            <button
              type="button"
              onClick={handleMiraSubmit}
              disabled={miraQuery.isPending || !miraMessage.trim()}
              style={primaryButtonStyle}
            >
              {miraQuery.isPending ? 'Mira is thinking…' : 'Send to Mira'}
            </button>
          )}

          {miraQuery.isError && (
            <p role="alert" style={{ fontSize: 13, color: '#C86D5A' }}>
              Mira is unavailable right now. Try the manual setup instead.
            </p>
          )}
        </div>
      ) : null}
    </OnboardingStep>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SwitchPathLink({
  current,
  onSwitch,
}: {
  current: 'manual' | 'mira';
  onSwitch: () => void;
}) {
  return (
    <button type="button" onClick={onSwitch} style={switchLinkStyle}>
      Switch to {current === 'manual' ? 'Mira setup' : 'manual setup'}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pathButtonStyle = (_accentColor: string): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '16px 18px',
  borderRadius: 12,
  border: '1.5px solid #D6D3D1',
  backgroundColor: '#FFFFFF',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.15s',
});

const skipLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 13,
  color: '#A8A29E',
  cursor: 'pointer',
  padding: '4px 0',
  textDecoration: 'underline',
  alignSelf: 'flex-start',
  marginTop: 4,
};

const switchLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 13,
  color: '#78716C',
  cursor: 'pointer',
  padding: '2px 0',
  textDecoration: 'underline',
  alignSelf: 'flex-start',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  backgroundColor: '#FFFFFF',
  fontSize: 14,
  color: '#1C1917',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  lineHeight: 1.5,
};

const miraResponseStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 10,
  backgroundColor: '#F5F5F4',
  border: '1px solid #E7E5E4',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#44403C',
  color: '#FAFAF9',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  backgroundColor: 'transparent',
  color: '#57534E',
  fontSize: 14,
  cursor: 'pointer',
};
