'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useTutorialStore } from '../../../lib/store/tutorial-store';
// React Query wrappers around the profile REST API
import { useProfile, useUpdateProfile, useDeleteAccount, useCurrencyRates } from '../../../lib/hooks/use-profile';
// Theme preference lives in Zustand so it applies synchronously without a server round-trip
import { useThemeStore } from '../../../lib/store/theme-store';
import type { ThemePreference, PeriodType } from '@lunero/core';
// Reuse the same currency list from onboarding to keep options consistent across the app
import { SUPPORTED_CURRENCIES } from '../../../components/onboarding/step-currency';
import { DeleteAccountDialog } from '../../../components/settings/delete-account-dialog';
import { requestNotificationPermission, unsubscribeFromPush } from '../../../lib/push-notifications';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '⚙️' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending: isSaving } = useUpdateProfile();
  const { mutateAsync: deleteAccount, isPending: isDeleting } = useDeleteAccount();
  const { data: currencyData } = useCurrencyRates();
  const { preference: themePreference, setPreference: setThemePreference } = useThemeStore();
  const openTutorial = useTutorialStore((s: ReturnType<typeof useTutorialStore.getState>) => s.openTutorial);

  const [displayName, setDisplayName] = useState('');
  const [displayNameDirty, setDisplayNameDirty] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Transient success message shown for 3 s after each save; null when hidden
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // One-time initialisation: seed the controlled input from the fetched profile.
  // Using a flag instead of useEffect avoids a render cycle where the input
  // briefly shows an empty string before the profile arrives.
  const [initialized, setInitialized] = useState(false);
  if (profile && !initialized) {
    setDisplayName(profile.displayName);
    setInitialized(true);
  }

  // Fall back to the static list if the currency-rates endpoint hasn't resolved yet
  const currencies = currencyData?.currencies ?? SUPPORTED_CURRENCIES;

  async function handleSaveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setDisplayNameError('Display name cannot be empty.');
      return;
    }
    setDisplayNameError('');
    await updateProfile({ displayName: trimmed });
    // Reset dirty flag so the Save button disappears until the user edits again
    setDisplayNameDirty(false);
    flash('Display name updated.');
  }

  // Each preference change is saved immediately (no explicit submit button)
  async function handleCurrencyChange(currency: string) {
    await updateProfile({ defaultCurrency: currency });
    flash('Default currency updated.');
  }

  async function handlePeriodChange(period: PeriodType) {
    await updateProfile({ flowsheetPeriod: period });
    flash('Period preference updated.');
  }

  // Theme is applied locally via Zustand first for instant feedback, then persisted to the server
  async function handleThemeChange(theme: ThemePreference) {
    setThemePreference(theme);
    await updateProfile({ themePreference: theme });
    flash('Theme updated.');
  }

  async function handleNotificationsChange(enabled: boolean) {
    await updateProfile({ overspendAlerts: enabled });
    if (enabled) {
      await requestNotificationPermission();
    } else {
      await unsubscribeFromPush();
    }
    flash('Notification preference updated.');
  }

  // After deletion the user is redirected to sign-in; no further state cleanup needed
  async function handleDeleteAccount() {
    await deleteAccount();
    router.replace('/sign-in');
  }

  // Shows a success banner for 3 seconds then clears it
  function flash(msg: string) {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3000);
  }

  if (isLoading || !profile) {
    return (
      <div role="status" aria-label="Loading settings" style={loadingStyle}>
        <span style={{ fontSize: 14, color: '#78716C' }}>Loading settings…</span>
      </div>
    );
  }

  return (
    <main aria-label="Profile and settings" style={pageStyle}>
      <h1 style={headingStyle}>Settings</h1>

      {saveSuccess && (
        <div role="status" aria-live="polite" style={successBannerStyle}>
          {saveSuccess}
        </div>
      )}

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="section-profile" style={sectionStyle}>
        <h2 id="section-profile" style={sectionHeadingStyle}>Profile</h2>

        {/* Display name */}
        <div style={fieldGroupStyle}>
          <label htmlFor="display-name" style={labelStyle}>Display name</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setDisplayNameDirty(true);
                  setDisplayNameError('');
                }}
                style={inputStyle}
                aria-describedby={displayNameError ? 'display-name-error' : undefined}
                aria-invalid={!!displayNameError}
              />
              {displayNameError && (
                <p id="display-name-error" role="alert" style={errorStyle}>{displayNameError}</p>
              )}
            </div>
            {displayNameDirty && (
              <button
                type="button"
                onClick={handleSaveDisplayName}
                disabled={isSaving}
                style={saveButtonStyle}
                aria-label="Save display name"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Email — read-only, managed by Clerk */}
        <div style={fieldGroupStyle}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            type="email"
            value={user?.primaryEmailAddress?.emailAddress ?? ''}
            readOnly
            style={{ ...inputStyle, backgroundColor: '#F5F5F4', color: '#78716C', cursor: 'default' }}
            aria-describedby="email-hint"
          />
          <p id="email-hint" style={hintStyle}>
            To change your email or password, use{' '}
            <a
              href="https://accounts.clerk.dev/user"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#44403C', textDecoration: 'underline' }}
            >
              your account page
            </a>
            .
          </p>
        </div>

        {/* Password change — Clerk UserProfile portal */}
        <div style={fieldGroupStyle}>
          <span style={labelStyle}>Password</span>
          <button
            type="button"
            onClick={() => router.push('/settings/account')}
            style={ghostButtonStyle}
            aria-label="Change password"
          >
            Change password →
          </button>
          <p style={hintStyle}>You'll be asked to re-authenticate before changing your password.</p>
        </div>
      </section>

      {/* ── Preferences ─────────────────────────────────────────────────── */}
      <section aria-labelledby="section-preferences" style={sectionStyle}>
        <h2 id="section-preferences" style={sectionHeadingStyle}>Preferences</h2>

        {/* Default currency */}
        <div style={fieldGroupStyle}>
          <label htmlFor="default-currency" style={labelStyle}>Default currency</label>
          <select
            id="default-currency"
            value={profile.defaultCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            style={selectStyle}
            aria-label="Select default currency"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* FlowSheet period */}
        <div style={fieldGroupStyle}>
          <span style={labelStyle} id="period-label">FlowSheet period</span>
          <div
            role="radiogroup"
            aria-labelledby="period-label"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {PERIOD_OPTIONS.map((opt) => {
              const selected = profile.flowsheetPeriod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handlePeriodChange(opt.value)}
                  style={chipButtonStyle(selected)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme */}
        <div style={fieldGroupStyle}>
          <span style={labelStyle} id="theme-label">Theme</span>
          <div
            role="radiogroup"
            aria-labelledby="theme-label"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {THEME_OPTIONS.map((opt) => {
              const selected = themePreference === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleThemeChange(opt.value)}
                  style={chipButtonStyle(selected)}
                >
                  <span aria-hidden="true" style={{ marginRight: 6 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overspend alerts */}
        <div style={fieldGroupStyle}>
          <span style={labelStyle} id="alerts-label">Overspend alerts</span>
          <div
            role="radiogroup"
            aria-labelledby="alerts-label"
            style={{ display: 'flex', gap: 8 }}
          >
            {([
              { value: true, label: 'On', icon: '🔔' },
              { value: false, label: 'Off', icon: '🔕' },
            ] as const).map((opt) => {
              const selected = profile.overspendAlerts === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleNotificationsChange(opt.value)}
                  style={chipButtonStyle(selected)}
                >
                  <span aria-hidden="true" style={{ marginRight: 6 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p style={hintStyle}>Notifies you when your available balance goes negative.</p>
        </div>
      </section>

      {/* ── Help & Tutorial ──────────────────────────────────────────────── */}
      <section aria-labelledby="section-help" style={sectionStyle}>
        <h2 id="section-help" style={sectionHeadingStyle}>Help</h2>
        <div style={fieldGroupStyle}>
          <span style={labelStyle}>Tutorial</span>
          <button
            type="button"
            onClick={openTutorial}
            style={ghostButtonStyle}
            aria-label="Re-launch the app tutorial"
          >
            Re-launch tutorial →
          </button>
          <p style={hintStyle}>Walk through the core features of Lunero again.</p>
        </div>
      </section>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <section aria-labelledby="section-danger" style={{ ...sectionStyle, borderColor: '#FECACA' }}>
        <h2 id="section-danger" style={{ ...sectionHeadingStyle, color: '#C86D5A' }}>Danger zone</h2>
        <div style={fieldGroupStyle}>
          <span style={labelStyle}>Delete account</span>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            style={dangerButtonStyle}
            aria-label="Delete your account"
          >
            Delete account
          </button>
          <p style={hintStyle}>
            All your data will be permanently removed within 30 days. This cannot be undone.
          </p>
        </div>
      </section>

      {showDeleteDialog && (
        <DeleteAccountDialog
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={isDeleting}
        />
      )}
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 600,
  display: 'flex',
  flexDirection: 'column',
  gap: 32,
};

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: '#1C1917',
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  padding: 24,
  borderRadius: 12,
  border: '1px solid #E7E5E4',
  backgroundColor: '#FFFFFF',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#78716C',
  margin: 0,
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#1C1917',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#A8A29E',
  margin: 0,
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#C86D5A',
  margin: '4px 0 0',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  fontSize: 14,
  color: '#1C1917',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  fontSize: 14,
  color: '#1C1917',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  cursor: 'pointer',
};

const saveButtonStyle: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#44403C',
  color: '#FAFAF9',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ghostButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '8px 0',
  background: 'none',
  border: 'none',
  fontSize: 14,
  color: '#44403C',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

const chipButtonStyle = (selected: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 14px',
  borderRadius: 20,
  border: `1.5px solid ${selected ? '#44403C' : '#D6D3D1'}`,
  backgroundColor: selected ? '#44403C' : '#FFFFFF',
  color: selected ? '#FAFAF9' : '#44403C',
  fontSize: 13,
  fontWeight: selected ? 500 : 400,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const dangerButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '8px 16px',
  borderRadius: 8,
  border: '1.5px solid #C86D5A',
  backgroundColor: 'transparent',
  color: '#C86D5A',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
};

const successBannerStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  backgroundColor: '#F0FDF4',
  border: '1px solid #BBF7D0',
  color: '#166534',
  fontSize: 13,
};
