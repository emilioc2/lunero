import React, { useState, useCallback } from 'react';
import { Text } from '@tamagui/core';
import type { EntryType, Category, ValidationResult } from '@lunero/core';
import { validateEntry } from '@lunero/core';
import { XStack, YStack } from './primitives';

export interface EntryFormValues {
  entryType: EntryType;
  categoryId: string;
  amount: string; // string for controlled input
  currency: string;
  entryDate: string; // ISO date string
  note: string;
}

export interface EntryFormProps {
  /** Pre-filled values for edit mode; omit for create mode */
  initialValues?: Partial<EntryFormValues>;
  categories: Category[];
  defaultCurrency?: string;
  supportedCurrencies?: string[];
  onSubmit: (values: EntryFormValues) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'savings', label: 'Savings' },
];

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];

function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

export function EntryForm({
  initialValues,
  categories,
  defaultCurrency = 'USD',
  supportedCurrencies = DEFAULT_CURRENCIES,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EntryFormProps) {
  const [values, setValues] = useState<EntryFormValues>({
    entryType: initialValues?.entryType ?? 'expense',
    categoryId: initialValues?.categoryId ?? '',
    amount: initialValues?.amount ?? '',
    currency: initialValues?.currency ?? defaultCurrency,
    entryDate: initialValues?.entryDate ?? todayIso(),
    note: initialValues?.note ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const filteredCategories = categories.filter((c) => c.entryType === values.entryType);

  const set = useCallback(<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const validate = useCallback((): boolean => {
    const result: ValidationResult = validateEntry({
      entryType: values.entryType,
      categoryId: values.categoryId,
      amount: parseFloat(values.amount),
      currency: values.currency,
      entryDate: values.entryDate,
    });
    setErrors(result.errors);
    return result.valid;
  }, [values]);

  const handleSubmit = useCallback(async () => {
    // Mark all fields touched on submit attempt
    setTouched({ entryType: true, categoryId: true, amount: true, currency: true, entryDate: true });
    if (!validate()) return;
    await onSubmit(values);
  }, [validate, onSubmit, values]);

  const handleEntryTypeChange = useCallback((type: EntryType) => {
    setValues((prev) => ({ ...prev, entryType: type, categoryId: '' }));
    setTouched((prev) => ({ ...prev, entryType: true, categoryId: false }));
  }, []);

  return (
    <YStack
      gap="$4"
      padding="$5"
      backgroundColor="$surface1"
      borderRadius="$3"
      role="form"
      aria-label={initialValues?.amount ? 'Edit entry' : 'Add entry'}
    >
      {/* Entry type selector */}
      <YStack gap="$2">
        <Text
          fontSize={12}
          textTransform="uppercase"
          letterSpacing={1}
          color="$placeholderColor"
          id="entry-type-label"
        >
          Type
        </Text>
        <XStack gap="$2" role="radiogroup" aria-labelledby="entry-type-label">
          {ENTRY_TYPES.map(({ value, label }) => (
            <TypeButton
              key={value}
              label={label}
              value={value}
              selected={values.entryType === value}
              onSelect={handleEntryTypeChange}
            />
          ))}
        </XStack>
      </YStack>

      {/* Amount */}
      <FormField
        label="Amount"
        htmlFor="entry-amount"
        error={touched['amount'] ? errors['amount'] : undefined}
      >
        <input
          id="entry-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={values.amount}
          onChange={(e) => set('amount', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, amount: true }))}
          placeholder="0.00"
          aria-describedby={errors['amount'] ? 'entry-amount-error' : undefined}
          aria-invalid={touched['amount'] && !!errors['amount']}
          style={inputStyle(!!(touched['amount'] && errors['amount']))}
        />
      </FormField>

      {/* Category */}
      <FormField
        label="Category"
        htmlFor="entry-category"
        error={touched['categoryId'] ? errors['categoryId'] : undefined}
      >
        <select
          id="entry-category"
          value={values.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, categoryId: true }))}
          aria-describedby={errors['categoryId'] ? 'entry-category-error' : undefined}
          aria-invalid={touched['categoryId'] && !!errors['categoryId']}
          style={inputStyle(!!(touched['categoryId'] && errors['categoryId']))}
        >
          <option value="">Select a category</option>
          {filteredCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </FormField>

      {/* Currency */}
      <FormField label="Currency" htmlFor="entry-currency">
        <select
          id="entry-currency"
          value={values.currency}
          onChange={(e) => set('currency', e.target.value)}
          style={inputStyle(false)}
        >
          {supportedCurrencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormField>

      {/* Date */}
      <FormField
        label="Date"
        htmlFor="entry-date"
        error={touched['entryDate'] ? errors['entryDate'] : undefined}
      >
        <input
          id="entry-date"
          type="date"
          value={values.entryDate}
          onChange={(e) => set('entryDate', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, entryDate: true }))}
          aria-describedby={errors['entryDate'] ? 'entry-date-error' : undefined}
          aria-invalid={touched['entryDate'] && !!errors['entryDate']}
          style={inputStyle(!!(touched['entryDate'] && errors['entryDate']))}
        />
      </FormField>

      {/* Note (optional) */}
      <FormField label="Note (optional)" htmlFor="entry-note">
        <input
          id="entry-note"
          type="text"
          value={values.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="Add a note…"
          maxLength={500}
          style={inputStyle(false)}
        />
      </FormField>

      {/* Actions */}
      <XStack gap="$3" justifyContent="flex-end" marginTop="$2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Cancel"
          style={secondaryButtonStyle}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          aria-label={initialValues?.amount ? 'Save changes' : 'Add entry'}
          style={primaryButtonStyle}
        >
          {isSubmitting ? 'Saving…' : initialValues?.amount ? 'Save changes' : 'Add entry'}
        </button>
      </XStack>
    </YStack>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface TypeButtonProps {
  label: string;
  value: EntryType;
  selected: boolean;
  onSelect: (v: EntryType) => void;
}

function TypeButton({ label, value, selected, onSelect }: TypeButtonProps) {
  const colorMap: Record<EntryType, string> = {
    income: '#6B6F69',
    expense: '#C86D5A',
    savings: '#C4A484',
  };
  const color = colorMap[value];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      style={{
        padding: '6px 14px',
        borderRadius: 9999,
        border: `1.5px solid ${selected ? color : '#D6D3D1'}`,
        backgroundColor: selected ? `${color}22` : 'transparent',
        color: selected ? color : '#78716C',
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  return (
    <YStack gap="$1">
      <label htmlFor={htmlFor} style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
        {label}
      </label>
      {children}
      {error && (
        <Text id={errorId} fontSize={12} color="$expense" role="alert" aria-live="polite">
          {error}
        </Text>
      )}
    </YStack>
  );
}

// ── Inline styles (avoids Tamagui input complexity for native HTML elements) ─

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: `1.5px solid ${hasError ? '#C86D5A' : '#D6D3D1'}`,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#1C1917',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#44403C',
  color: '#FAFAF9',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  backgroundColor: 'transparent',
  color: '#57534E',
  fontSize: 14,
  cursor: 'pointer',
};
