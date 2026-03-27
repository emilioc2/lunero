'use client';

import { useEffect, useRef } from 'react';
import { EntryForm } from '@lunero/ui';
import type { EntryFormValues } from '@lunero/ui';
import type { Category, Entry } from '@lunero/core';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

interface EntryModalProps {
  mode: 'create' | 'edit';
  /** Populated only in edit mode; drives initialValues for the form */
  entry?: Entry;
  categories: Category[];
  /** User's default currency pre-fills the currency selector */
  defaultCurrency?: string;
  supportedCurrencies?: string[];
  /** Pre-populate the date field (used when adding from a calendar day cell) */
  prefillDate?: string;
  onSubmit: (values: EntryFormValues) => Promise<void>;
  onClose: () => void;
  /** Disables the submit button while the mutation is in-flight */
  isSubmitting?: boolean;
}

export function EntryModal({
  mode,
  entry,
  categories,
  defaultCurrency,
  supportedCurrencies,
  prefillDate,
  onSubmit,
  onClose,
  isSubmitting,
}: EntryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the modal panel; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  // Global Escape key listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const initialValues = entry
    ? {
        entryType: entry.entryType,
        categoryId: entry.categoryId,
        amount: String(entry.amount),
        currency: entry.currency,
        entryDate: entry.entryDate,
        note: entry.note ?? '',
      }
    : prefillDate
      ? { entryDate: prefillDate }
      : undefined;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Add entry' : 'Edit entry'}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="entry-modal-overlay"
    >
      <div ref={panelRef} className="entry-modal-panel">
        {/* Header row: title on the left, close button on the right */}
        <div className="entry-modal-header">
          <span className="entry-modal-title">
            {mode === 'create' ? 'Add Entry' : 'Edit Entry'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="entry-modal-close"
          >
            ✕
          </button>
        </div>

        <EntryForm
          initialValues={initialValues}
          categories={categories}
          defaultCurrency={defaultCurrency}
          supportedCurrencies={supportedCurrencies}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </div>

      <style>{`
        .entry-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 16px;
        }
        .entry-modal-panel {
          background: #FAFAF9;
          border-radius: 12px;
          padding: 24px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .entry-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .entry-modal-title {
          font-size: 16px;
          font-weight: 500;
          color: #1C1917;
        }
        .entry-modal-close {
          background: none;
          border: none;
          font-size: 16px;
          color: #78716C;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
        }
        .entry-modal-close:hover { background: #F5F5F4; }
        .entry-modal-close:focus-visible {
          outline: 2px solid #44403C;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
