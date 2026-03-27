/**
 * Web Push notification utilities.
 *
 * Handles service worker registration, permission requests, and
 * push subscription management. The subscription JSON is sent to
 * the backend as the token value for POST /api/v1/notifications/token.
 */

import { notificationApi } from '@lunero/api-client';

const SW_PATH = '/sw.js';

/** Reads the VAPID public key at call time so tests can override process.env. */
function getVapidKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
}

/** Converts a base64url VAPID public key to a Uint8Array for the browser API. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Registers the service worker if not already registered.
 * Safe to call multiple times — returns the existing registration if present.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (existing) return existing;

    const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('[push] Service worker registration failed:', err);
    return null;
  }
}

/**
 * Requests notification permission and, if granted, subscribes to Web Push
 * and registers the subscription token with the backend.
 *
 * Returns `true` if permission was granted and the token was registered.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  // Access via window to allow test stubbing
  const NotifAPI = (window as unknown as Record<string, unknown>).Notification as {
    permission: NotificationPermission;
    requestPermission: () => Promise<NotificationPermission>;
  };

  // Already denied — can't re-prompt programmatically
  if (NotifAPI.permission === 'denied') return false;

  const permission = await NotifAPI.requestPermission();
  if (permission !== 'granted') return false;

  return subscribeToPush();
}

/**
 * Subscribes to Web Push using the VAPID public key and registers the
 * resulting subscription with the backend. Idempotent — safe to call
 * if already subscribed.
 */
export async function subscribeToPush(): Promise<boolean> {
  const vapidKey = getVapidKey();
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — skipping push subscription');
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));

    await notificationApi.registerToken({
      token: JSON.stringify(subscription.toJSON()),
      platform: 'web',
    });

    return true;
  } catch (err) {
    console.error('[push] Push subscription failed:', err);
    return false;
  }
}

/**
 * Unsubscribes from Web Push and removes the token from the backend.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const tokenJson = JSON.stringify(subscription.toJSON());
    await subscription.unsubscribe();
    await notificationApi.deregisterToken(tokenJson);
  } catch (err) {
    console.error('[push] Unsubscribe failed:', err);
  }
}

/** Returns the current notification permission state, or 'unsupported'. */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return ((window as unknown as Record<string, unknown>).Notification as { permission: NotificationPermission }).permission;
}
