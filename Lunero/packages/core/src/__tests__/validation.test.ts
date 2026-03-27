import { describe, it, expect } from 'vitest';
import { validateEntry, validateFlowSheet } from '../validation';
import type { Entry, FlowSheet } from '../types';

describe('validateEntry', () => {
  const valid: Partial<Entry> = {
    amount: 100,
    entryType: 'expense',
    categoryId: 'cat1',
    entryDate: '2024-01-15',
    currency: 'USD',
  };

  it('passes for a valid entry', () => {
    const result = validateEntry(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('fails when amount is missing', () => {
    const result = validateEntry({ ...valid, amount: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors['amount']).toBeDefined();
  });

  it('fails when amount is zero', () => {
    const result = validateEntry({ ...valid, amount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors['amount']).toBeDefined();
  });

  it('fails when amount is negative', () => {
    const result = validateEntry({ ...valid, amount: -50 });
    expect(result.valid).toBe(false);
    expect(result.errors['amount']).toBeDefined();
  });

  it('fails when entryType is missing', () => {
    const result = validateEntry({ ...valid, entryType: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors['entryType']).toBeDefined();
  });

  it('fails when entryType is invalid', () => {
    const result = validateEntry({ ...valid, entryType: 'invalid' as Entry['entryType'] });
    expect(result.valid).toBe(false);
    expect(result.errors['entryType']).toBeDefined();
  });

  it('passes for all valid entry types', () => {
    for (const type of ['income', 'expense', 'savings'] as const) {
      expect(validateEntry({ ...valid, entryType: type }).valid).toBe(true);
    }
  });

  it('fails when categoryId is missing', () => {
    const result = validateEntry({ ...valid, categoryId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors['categoryId']).toBeDefined();
  });

  it('fails when entryDate is missing', () => {
    const result = validateEntry({ ...valid, entryDate: '' });
    expect(result.valid).toBe(false);
    expect(result.errors['entryDate']).toBeDefined();
  });

  it('fails when currency is missing', () => {
    const result = validateEntry({ ...valid, currency: '' });
    expect(result.valid).toBe(false);
    expect(result.errors['currency']).toBeDefined();
  });

  it('accumulates multiple errors', () => {
    const result = validateEntry({ amount: 0, entryType: undefined, categoryId: '' });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(1);
  });
});

describe('validateFlowSheet', () => {
  const valid: Partial<FlowSheet> = {
    periodType: 'monthly',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  };

  it('passes for a valid FlowSheet', () => {
    const result = validateFlowSheet(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('fails when periodType is missing', () => {
    const result = validateFlowSheet({ ...valid, periodType: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors['periodType']).toBeDefined();
  });

  it('fails when periodType is invalid', () => {
    const result = validateFlowSheet({ ...valid, periodType: 'quarterly' as FlowSheet['periodType'] });
    expect(result.valid).toBe(false);
    expect(result.errors['periodType']).toBeDefined();
  });

  it('passes for all valid period types', () => {
    for (const type of ['weekly', 'monthly', 'custom'] as const) {
      expect(validateFlowSheet({ ...valid, periodType: type }).valid).toBe(true);
    }
  });

  it('fails when startDate is missing', () => {
    const result = validateFlowSheet({ ...valid, startDate: '' });
    expect(result.valid).toBe(false);
    expect(result.errors['startDate']).toBeDefined();
  });

  it('fails when endDate is missing', () => {
    const result = validateFlowSheet({ ...valid, endDate: '' });
    expect(result.valid).toBe(false);
    expect(result.errors['endDate']).toBeDefined();
  });

  it('fails when endDate is before startDate', () => {
    const result = validateFlowSheet({ ...valid, startDate: '2024-01-31', endDate: '2024-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors['endDate']).toBeDefined();
  });

  it('passes when startDate equals endDate (single-day period)', () => {
    const result = validateFlowSheet({ ...valid, startDate: '2024-01-15', endDate: '2024-01-15' });
    expect(result.valid).toBe(true);
  });
});
