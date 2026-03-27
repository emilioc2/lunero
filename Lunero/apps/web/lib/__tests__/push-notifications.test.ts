/**
 * Tests for push-notifications utility.
 * Browser globals (navigator, window.Notification) are stubbed via vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@lunero/api-client', () => ({
  notificationApi: {
    registerToken: vi.fn().mockResolvedValue(undefined),
    deregisterToken: vi.fn().mockResolvedValue(undefined),
  },
}));

import { notificationApi } from '@lunero/api-client';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
} from '../push-notifications';

// ── Shared mock objects ───────────────────────────────────────────────────────

const mockSubscription = {
  toJSON: () => ({ endpoint: 'https://push.example.com/sub', keys: { p256dh: 'abc', auth: 'xyz' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
};

const mockRegistration = { pushManager: mockPushManager };

function makeServiceWorker(overrides: Record<string, unknown> = {}) {
  return {
    getRegistration: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(mockRegistration),
    ready: Promise.resolve(mockRegistration),
    ...overrides,
  };
}

// ── registerServiceWorker ─────────────────────────────────────────────────────

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns null when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });

  it('returns null when serviceWorker is not in navigator', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });

  it('returns existing registration without re-registering', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      serviceWorker: makeServiceWorker({
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
      }),
    });
    const result = await registerServiceWorker();
    expect(result).toBe(mockRegistration);
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it('registers a new service worker when none exists', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { serviceWorker: makeServiceWorker() });
    const result = await registerServiceWorker();
    expect(result).toBe(mockRegistration);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('returns null and logs error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      serviceWorker: makeServiceWorker({
        getRegistration: vi.fn().mockRejectedValue(new Error('SW error')),
      }),
    });
    const result = await registerServiceWorker();
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[push]'), expect.any(Error));
    consoleSpy.mockRestore();
  });
});

// ── requestNotificationPermission ────────────────────────────────────────────

describe('requestNotificationPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'dGVzdA';
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(mockSubscription);
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { serviceWorker: makeServiceWorker() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('returns false when Notification is not in window', async () => {
    vi.stubGlobal('window', {});
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('returns false when permission is already denied', async () => {
    vi.stubGlobal('window', {
      Notification: { permission: 'denied', requestPermission: vi.fn() },
    });
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('returns false when user dismisses the prompt', async () => {
    vi.stubGlobal('window', {
      Notification: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
    });
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('subscribes and registers token when permission is granted', async () => {
    vi.stubGlobal('window', {
      Notification: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(notificationApi.registerToken).toHaveBeenCalledWith({
      token: JSON.stringify(mockSubscription.toJSON()),
      platform: 'web',
    });
  });
});

// ── subscribeToPush ───────────────────────────────────────────────────────────

describe('subscribeToPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'dGVzdA';
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(mockSubscription);
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { serviceWorker: makeServiceWorker() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when VAPID key is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = '';
    const result = await subscribeToPush();
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });

  it('reuses existing subscription without re-subscribing', async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    await subscribeToPush();
    expect(mockPushManager.subscribe).not.toHaveBeenCalled();
    expect(notificationApi.registerToken).toHaveBeenCalledWith({
      token: JSON.stringify(mockSubscription.toJSON()),
      platform: 'web',
    });
  });

  it('creates new subscription when none exists', async () => {
    const result = await subscribeToPush();
    expect(result).toBe(true);
    expect(mockPushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
  });

  it('returns false and logs error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPushManager.getSubscription.mockRejectedValue(new Error('push error'));
    const result = await subscribeToPush();
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ── unsubscribeFromPush ───────────────────────────────────────────────────────

describe('unsubscribeFromPush', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does nothing when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    await expect(unsubscribeFromPush()).resolves.toBeUndefined();
    expect(notificationApi.deregisterToken).not.toHaveBeenCalled();
  });

  it('does nothing when no registration exists', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(undefined) },
    });
    await unsubscribeFromPush();
    expect(notificationApi.deregisterToken).not.toHaveBeenCalled();
  });

  it('does nothing when no push subscription exists', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
    });
    await unsubscribeFromPush();
    expect(notificationApi.deregisterToken).not.toHaveBeenCalled();
  });

  it('unsubscribes and deregisters token from backend', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(mockSubscription) },
        }),
      },
    });
    await unsubscribeFromPush();
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(notificationApi.deregisterToken).toHaveBeenCalledWith(
      JSON.stringify(mockSubscription.toJSON())
    );
  });
});

// ── getNotificationPermission ─────────────────────────────────────────────────

describe('getNotificationPermission', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns "unsupported" when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('returns "unsupported" when Notification is not in window', () => {
    vi.stubGlobal('window', {});
    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('returns current permission state', () => {
    vi.stubGlobal('window', { Notification: { permission: 'granted' } });
    expect(getNotificationPermission()).toBe('granted');
  });
});
