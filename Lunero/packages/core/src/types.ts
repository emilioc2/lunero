// Lunero domain types — shared across web and mobile

export type EntryType = 'income' | 'expense' | 'savings';
export type PeriodType = 'weekly' | 'monthly' | 'custom';
export type Cadence = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface FlowSheet {
  id: string;
  userId: string;
  periodType: PeriodType;
  startDate: string; // ISO date string (UTC)
  endDate: string;
  status: 'active' | 'archived';
  editLocked: boolean;
  availableBalance: number; // computed, not stored
  totalIncome: number;      // computed
  totalExpenses: number;    // computed
  totalSavings: number;     // computed
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  flowSheetId: string;
  userId: string;
  entryType: EntryType;
  categoryId: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  conversionRate?: number;
  entryDate: string; // ISO date string
  note?: string;
  isDeleted: boolean;
  clientUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  entryType: EntryType;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface RecurringEntry {
  id: string;
  userId: string;
  entryType: EntryType;
  categoryId: string;
  amount: number;
  currency: string;
  cadence: Cadence;
  note?: string;
  isPaused: boolean;
  isDeleted: boolean;
}

export interface UserProfile {
  id: string;
  clerkUserId: string;
  displayName: string;
  defaultCurrency: string;
  flowsheetPeriod: PeriodType;
  themePreference: ThemePreference;
  overspendAlerts: boolean;
  onboardingComplete: boolean;
  onboardingStep: number;
  tutorialComplete: boolean;
}

export interface CategoryProjection {
  id: string;
  flowSheetId: string;
  userId: string;
  categoryId: string;
  projectedAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectionSummary {
  flowSheetId: string;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    entryType: EntryType;
    projectedAmount: number;
    actualAmount: number;
    statusColor: string;
  }>;
  byEntryType: Record<EntryType, { projected: number; actual: number; statusColor: string }>;
  overall: { projected: number; actual: number; statusColor: string };
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
