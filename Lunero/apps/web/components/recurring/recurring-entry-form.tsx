'use client';

import { useState, useEffect, useRef } from 'react';
import type { RecurringEntry, Category, EntryType, Cadence } from '@lunero/core';
import type { CreateRecurringEntryDto, UpdateRecurringEntryDto } from '@lunero/api-client';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

const TYPE_OPTIONS: { value: EntryType; label: string; color: string }[] = [
  { value: 'income', label: 'Income', color: '#6B6F69' },
  { value: 'expense', label: 'Expense', color: '#C86D5A' },
  { value: 'savings', label: 'Savings', color: '#C4A484' },
];

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface RecurringEntryFormProps {
  mode: 'create' | 'edit';
  entry?: RecurringEntry;
  categories: Category[];
  defaultCurrency?: string;
  onSubmit: (data: CreateRecurringEntryDto | UpdateRecurringEntryDto) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function RecurringEntryForm({
  mode,
  entry,
  categories,
  defaultCurrency = 'USD',
  onSubmit,
  onClose,
  isSubmitting,
}: RecurringEntryFormProps) {
  const [entryType, setEntryType] = useState<EntryType>(entry?.entryType ?? 'expense');
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [currency, setCurrency] = useState(entry?.currency ?? defaultCurrency);
  const [cadence, setCadence] = useState<Cadence>(entry?.cadence ?? 'monthly');
  const [note, setNote] = useState(entry?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dialog; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  const filteredCategories = categories.filter((c) => c.entryType === entryType);

  useEffect(() => {
    if (mode === 'create') {
      setCategoryId('');
    }
  }, [entryType, mode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      next.amount = 'Amount must be greater than 0.';
    }
    if (!categoryId) {
      next.categoryId = 'Please select a category.';
    }
    if (!currency.trim() || currency.trim().length !== 3) {
      next.currency = 'Currency must be a 3-letter code (e.g. USD).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (mode === 'create') {
      await onSubmit({
        entryType,
        categoryId,
        amount: parseFloat(amount),
        currency: currency.trim().toUpperCase(),
        cadence,
        note: note.trim() || undefined,
      } satisfies CreateRecurringEntryDto);
    } else {
      await onSubmit({
        categoryId,
        amount: parseFloat(amount),
        currency: currency.trim().toUpperCase(),
        cadence,
        note: note.trim() || undefined,
      } satisfies UpdateRecurringEntryDto);
    }
  };

  const typeColor = TYPE_OPTIONS.find((t) => t.value === entryType)?.color ?? '#6B6F69';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rec-form-title"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: 16,
      }}
    >
      <div
        ref={panelRef}
        style={{
          background: '#FAFAF9', borderRadius: 12,
          padding: '28px 24px', width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h2
          id="rec-form-title"
          style={{ fontSize: 16, fontWeight: 500, color: '#1C1917', margin: '0 0 20px' }}
        >
          {mode === 'create' ? 'New Recurring Entry' : 'Edit Recurring Entry'}
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Entry type */}
          <div style={{ marginBottom: 16 }}>
            <p
              id="rec-type-label"
              style={{ fontSize: 13, fontWeight: 500, color: '#57534E', margin: '0 0 8px' }}
            >
              Type
              {mode === 'edit' && (
                <span style={{ fontSize: 11, color: '#A8A29E', fontWeight: 400, marginLeft: 8 }}>
                  (locked after creation)
                </span>
              )}
            </p>

            {mode === 'create' ? (
              <div role="radiogroup" aria-labelledby="rec-type-label" style={{ display: 'flex', gap: 8 }}>
                {TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${entryType === opt.value ? opt.color : '#E7E5E4'}`,
                      background: entryType === opt.value ? `${opt.color}15` : '#FFFFFF',
                    }}
                  >
                    <input
                      type="radio"
                      name="entryType"
                      value={opt.value}
                      checked={entryType === opt.value}
                      onChange={() => setEntryType(opt.value)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      aria-label={opt.label}
                    />
                    <span
                      style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }}
                      aria-hidden="true"
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: opt.color }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: `${typeColor}15`, border: `1.5px solid ${typeColor}`,
                }}
              >
                <span
                  style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor }}
                  aria-hidden="true"
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: typeColor }}>
                  {TYPE_OPTIONS.find((t) => t.value === entryType)?.label}
                </span>
              </div>
            )}
          </div>

          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="rec-category"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
            >
              Category
            </label>
            <select
              id="rec-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
              aria-required="true"
              aria-invalid={!!errors.categoryId}
              aria-describedby={errors.categoryId ? 'rec-cat-error' : undefined}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', borderRadius: 8,
                border: `1.5px solid ${errors.categoryId ? '#C86D5A' : '#D6D3D1'}`,
                fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="">Select a category\u2026</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && (
              <p id="rec-cat-error" role="alert" style={{ fontSize: 12, color: '#C86D5A', margin: '4px 0 0' }}>
                {errors.categoryId}
              </p>
            )}
          </div>

          {/* Amount + Currency row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="rec-amount"
                style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
              >
                Amount
              </label>
              <input
                id="rec-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                placeholder="0.00"
                aria-required="true"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? 'rec-amount-error' : undefined}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', borderRadius: 8,
                  border: `1.5px solid ${errors.amount ? '#C86D5A' : '#D6D3D1'}`,
                  fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                  outline: 'none',
                }}
              />
              {errors.amount && (
                <p id="rec-amount-error" role="alert" style={{ fontSize: 12, color: '#C86D5A', margin: '4px 0 0' }}>
                  {errors.amount}
                </p>
              )}
            </div>

            <div style={{ width: 90 }}>
              <label
                htmlFor="rec-currency"
                style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
              >
                Currency
              </label>
              <input
                id="rec-currency"
                type="text"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value.toUpperCase().slice(0, 3));
                  if (errors.currency) setErrors((prev) => ({ ...prev, currency: '' }));
                }}
                maxLength={3}
                placeholder="USD"
                aria-required="true"
                aria-invalid={!!errors.currency}
                aria-describedby={errors.currency ? 'rec-currency-error' : undefined}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', borderRadius: 8,
                  border: `1.5px solid ${errors.currency ? '#C86D5A' : '#D6D3D1'}`,
                  fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                  outline: 'none', textTransform: 'uppercase',
                }}
              />
              {errors.currency && (
                <p id="rec-currency-error" role="alert" style={{ fontSize: 12, color: '#C86D5A', margin: '4px 0 0' }}>
                  {errors.currency}
                </p>
              )}
            </div>
          </div>

          {/* Cadence */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="rec-cadence"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
            >
              Cadence
            </label>
            <select
              id="rec-cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as Cadence)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', borderRadius: 8,
                border: '1.5px solid #D6D3D1',
                fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                outline: 'none',
              }}
            >
              {CADENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="rec-note"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
            >
              Note
              <span style={{ fontSize: 11, color: '#A8A29E', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
            </label>
            <textarea
              id="rec-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Netflix subscription"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', borderRadius: 8,
                border: '1.5px solid #D6D3D1',
                fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 20px', borderRadius: 8,
                border: '1.5px solid #D6D3D1', background: 'transparent',
                color: '#57534E', fontSize: 14, cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: '#44403C', color: '#FAFAF9',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting
                ? (mode === 'create' ? 'Creating\u2026' : 'Saving\u2026')
                : (mode === 'create' ? 'Create' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
