'use client';

import { useState, useEffect, useRef } from 'react';
import type { CreateCategoryDto } from '@lunero/api-client';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Income', color: '#6B6F69' },
  { value: 'expense', label: 'Expense', color: '#C86D5A' },
  { value: 'savings', label: 'Savings', color: '#C4A484' },
] as const;

interface CreateCategoryFormProps {
  onSubmit: (data: CreateCategoryDto) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

/**
 * Modal form for creating a new category.
 * Entry type is selected here and becomes immutable after creation (Requirement 3.4).
 */
export function CreateCategoryForm({ onSubmit, onClose, isSubmitting }: CreateCategoryFormProps) {
  const [name, setName] = useState('');
  const [entryType, setEntryType] = useState<'income' | 'expense' | 'savings'>('expense');
  const [nameError, setNameError] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dialog; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = (): boolean => {
    if (!name.trim()) {
      setNameError('Category name is required.');
      return false;
    }
    if (name.trim().length > 100) {
      setNameError('Name must be 100 characters or fewer.');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), entryType });
  };

  const selectedColor = TYPE_OPTIONS.find((t) => t.value === entryType)?.color ?? '#6B6F69';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-cat-title"
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
          padding: '28px 24px', width: '100%', maxWidth: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <h2
          id="create-cat-title"
          style={{ fontSize: 16, fontWeight: 500, color: '#1C1917', margin: '0 0 20px' }}
        >
          New Category
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Name field */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="cat-name"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
            >
              Name
            </label>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Groceries"
              maxLength={100}
              aria-required="true"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'cat-name-error' : undefined}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px', borderRadius: 8,
                border: `1.5px solid ${nameError ? '#C86D5A' : '#D6D3D1'}`,
                fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                outline: 'none',
              }}
            />
            {nameError && (
              <p
                id="cat-name-error"
                role="alert"
                style={{ fontSize: 12, color: '#C86D5A', margin: '4px 0 0' }}
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: 24 }}>
            <p
              style={{ fontSize: 13, fontWeight: 500, color: '#57534E', margin: '0 0 8px' }}
              id="cat-type-label"
            >
              Type
              <span
                style={{ fontSize: 11, color: '#A8A29E', fontWeight: 400, marginLeft: 8 }}
                aria-label="Type cannot be changed after creation"
              >
                (locked after creation)
              </span>
            </p>
            <div
              role="radiogroup"
              aria-labelledby="cat-type-label"
              style={{ display: 'flex', gap: 8 }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${entryType === opt.value ? opt.color : '#E7E5E4'}`,
                    background: entryType === opt.value ? `${opt.color}15` : '#FFFFFF',
                    transition: 'border-color 0.15s, background 0.15s',
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
                  <span style={{ fontSize: 13, fontWeight: 500, color: opt.color }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 8,
              background: '#F5F5F4', marginBottom: 24,
            }}
            aria-label="Category preview"
          >
            <span
              style={{ width: 8, height: 8, borderRadius: '50%', background: selectedColor, flexShrink: 0 }}
              aria-hidden="true"
            />
            <span style={{ fontSize: 13, color: '#57534E' }}>
              {name.trim() || 'Category name'}
            </span>
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
              {isSubmitting ? 'Creating\u2026' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
