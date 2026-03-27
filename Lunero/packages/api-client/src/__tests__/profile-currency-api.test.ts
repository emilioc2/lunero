import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { profileApi } from '../profile-api';
import { currencyApi } from '../currency-api';

const profile = {
  id: 'u1',
  clerkUserId: 'clerk_u1',
  displayName: 'Alex',
  defaultCurrency: 'USD',
  flowsheetPeriod: 'monthly',
  themePreference: 'system',
  overspendAlerts: true,
  onboardingComplete: true,
  onboardingStep: 6,
  tutorialComplete: false,
};

const ratesResponse = {
  currencies: ['USD', 'EUR', 'GBP'],
  rates: { EUR: 0.92, GBP: 0.79 },
  updatedAt: '2024-01-15T00:00:00Z',
  ratesStale: false,
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('profileApi', () => {
  it('get — GET /api/v1/profile', async () => {
    mock.onGet('/api/v1/profile').reply(200, profile);
    const result = await profileApi.get();
    expect(result.displayName).toBe('Alex');
    expect(result.defaultCurrency).toBe('USD');
  });

  it('update — PATCH /api/v1/profile', async () => {
    const updated = { ...profile, displayName: 'Jordan' };
    mock.onPatch('/api/v1/profile').reply(200, updated);
    const result = await profileApi.update({ displayName: 'Jordan' });
    expect(result.displayName).toBe('Jordan');
  });

  it('update — persists overspendAlerts preference', async () => {
    const updated = { ...profile, overspendAlerts: false };
    mock.onPatch('/api/v1/profile').reply(200, updated);
    const result = await profileApi.update({ overspendAlerts: false });
    expect(result.overspendAlerts).toBe(false);
  });

  it('delete — DELETE /api/v1/profile returns void', async () => {
    mock.onDelete('/api/v1/profile').reply(204);
    await expect(profileApi.delete()).resolves.toBeUndefined();
  });

  it('rejects with 401 when unauthenticated', async () => {
    mock.onGet('/api/v1/profile').reply(401, { title: 'Unauthorized' });
    await expect(profileApi.get()).rejects.toMatchObject({ status: 401 });
  });
});

describe('currencyApi', () => {
  it('getRates — GET /api/v1/currencies', async () => {
    mock.onGet('/api/v1/currencies').reply(200, ratesResponse);
    const result = await currencyApi.getRates();
    expect(result.currencies).toContain('USD');
    expect(result.rates.EUR).toBe(0.92);
    expect(result.ratesStale).toBe(false);
  });

  it('getRates — handles stale rates flag', async () => {
    mock.onGet('/api/v1/currencies').reply(200, { ...ratesResponse, ratesStale: true });
    const result = await currencyApi.getRates();
    expect(result.ratesStale).toBe(true);
  });

  it('rejects with 503 when FX service is unavailable', async () => {
    mock.onGet('/api/v1/currencies').reply(503, { title: 'Service Unavailable' });
    await expect(currencyApi.getRates()).rejects.toMatchObject({ status: 503 });
  });
});
