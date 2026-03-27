'use client';

import { useEffect, useRef } from 'react';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

interface DeleteRecurringDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * Confirmation dialog for recurring entry deletion.
 * Traps focus inside, focuses Cancel on mount (safer default), closes on Escape.
 */
export function DeleteRecurringDialog({ onConfirm, onCancel, isDeleting }: DeleteRecurringDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dialog; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-rec-title"
      aria-describedby="del-rec-desc"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        ref={panelRef}
        style={{
          background: '#FAFAF9', borderRadius: 12,
          padding: '28px 24px', width: '100%', maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <p id="del-rec-title" style={{ fontSize: 16, fontWeight: 500, color: '#1C1917', margin: '0 0 8px' }}>
          Delete recurring entry?
        </p>
        <p id="del-rec-desc" style={{ fontSize: 14, color: '#78716C', margin: '0 0 24px', lineHeight: 1.5 }}>
          This recurring entry will be removed and will no longer be added to future FlowSheets.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Cancel deletion"
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1.5px solid #D6D3D1', background: 'transparent',
              color: '#57534E', fontSize: 14, cursor: 'pointer',
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label="Confirm delete recurring entry"
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#C86D5A', color: '#FAFAF9',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            {isDeleting ? 'Deleting\u2026' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
