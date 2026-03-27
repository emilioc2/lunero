import type { Entry, FlowSheet, ValidationResult } from './types';

const VALID_ENTRY_TYPES = new Set(['income', 'expense', 'savings']);
const VALID_PERIOD_TYPES = new Set(['weekly', 'monthly', 'custom']);

/**
 * Validates a partial Entry before creation or update.
 * Returns field-level errors for any violations.
 */
export function validateEntry(entry: Partial<Entry>): ValidationResult {
  const errors: Record<string, string> = {};

  if (entry.amount !== undefined) {
    if (typeof entry.amount !== 'number' || entry.amount <= 0) {
      errors['amount'] = 'Amount must be greater than 0.';
    }
  } else {
    errors['amount'] = 'Amount is required.';
  }

  if (!entry.entryType) {
    errors['entryType'] = 'Entry type is required.';
  } else if (!VALID_ENTRY_TYPES.has(entry.entryType)) {
    errors['entryType'] = 'Entry type must be income, expense, or savings.';
  }

  if (!entry.categoryId || entry.categoryId.trim() === '') {
    errors['categoryId'] = 'Category is required.';
  }

  if (!entry.entryDate || entry.entryDate.trim() === '') {
    errors['entryDate'] = 'Entry date is required.';
  }

  if (!entry.currency || entry.currency.trim() === '') {
    errors['currency'] = 'Currency is required.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates a partial FlowSheet before creation.
 * Returns field-level errors for any violations.
 */
export function validateFlowSheet(sheet: Partial<FlowSheet>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!sheet.periodType) {
    errors['periodType'] = 'Period type is required.';
  } else if (!VALID_PERIOD_TYPES.has(sheet.periodType)) {
    errors['periodType'] = 'Period type must be weekly, monthly, or custom.';
  }

  if (!sheet.startDate || sheet.startDate.trim() === '') {
    errors['startDate'] = 'Start date is required.';
  }

  if (!sheet.endDate || sheet.endDate.trim() === '') {
    errors['endDate'] = 'End date is required.';
  }

  if (sheet.startDate && sheet.endDate) {
    const start = new Date(sheet.startDate);
    const end = new Date(sheet.endDate);
    if (isNaN(start.getTime())) {
      errors['startDate'] = 'Start date is invalid.';
    } else if (isNaN(end.getTime())) {
      errors['endDate'] = 'End date is invalid.';
    } else if (end < start) {
      errors['endDate'] = 'End date must be on or after start date.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
