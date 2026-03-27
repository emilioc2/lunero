import type { UserProfile } from '@lunero/core';
import { apiClient } from './http';

export interface UpdateProfileDto {
  displayName?: string;
  defaultCurrency?: string;
  flowsheetPeriod?: 'weekly' | 'monthly' | 'custom';
  themePreference?: 'light' | 'dark' | 'system';
  overspendAlerts?: boolean;
  onboardingComplete?: boolean;
  onboardingStep?: number;
  tutorialComplete?: boolean;
}

export const profileApi = {
  get(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/api/v1/profile').then((r) => r.data);
  },

  update(data: UpdateProfileDto): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/api/v1/profile', data).then((r) => r.data);
  },

  delete(): Promise<void> {
    return apiClient.delete('/api/v1/profile').then(() => undefined);
  },
};
