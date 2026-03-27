import { apiClient } from './http';

// Payload for registering a push notification token with the backend.
// Platform distinguishes between Web Push (VAPID), APNs (ios), and FCM (android).
export interface RegisterTokenRequest {
  token: string;
  platform: 'web' | 'ios' | 'android';
}

export const notificationApi = {
  /**
   * Registers a push notification token for the authenticated user.
   * Called after the browser/device grants notification permission and a
   * subscription token is obtained (e.g. via PushManager.subscribe on web).
   */
  registerToken(data: RegisterTokenRequest): Promise<void> {
    // Discard the response body — the backend returns 204 No Content on success.
    return apiClient.post('/api/v1/notifications/token', data).then(() => undefined);
  },

  /**
   * Removes a previously registered push token.
   * Should be called on sign-out or when the user disables notifications,
   * so the backend stops sending pushes to a stale/revoked token.
   * The token is sent in the request body (DELETE with a body) because
   * tokens can be long strings that exceed safe URL length limits.
   */
  deregisterToken(token: string): Promise<void> {
    return apiClient.delete('/api/v1/notifications/token', { data: { token } }).then(() => undefined);
  },
};
