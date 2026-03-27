'use client';

import { useEffect, useRef } from 'react';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

interface DeleteConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * Accessible confirmation dialog for entry deletion.
 * Focuses cancel by default (safer), closes on Escape, traps focus inside.
 */
export function DeleteConfirmDialog({ onConfirm, onCancel, isDeleting }: DeleteConfirmDialogProps) {
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
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      className="delete-overlay"
    >
      <div ref={panelRef} className="delete-panel">
        <p id="delete-dialog-title" className="delete-title">Delete entry?</p>
        <p id="delete-dialog-desc" className="delete-desc">
          This entry will be removed and your available balance will be recalculated.
        </p>
        <div className="delete-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Cancel deletion"
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label="Confirm delete entry"
            className="btn-danger"
          >
            {isDeleting ? 'Deleting\u2026' : 'Delete'}
          </button>
        </div>
      </div>

      <style>{`
        .delete-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 60; padding: 16px;
        }
        .delete-panel {
          background: #FAFAF9; border-radius: 12px;
          padding: 28px 24px; width: 100%; max-width: 360px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .delete-title { font-size: 16px; font-weight: 500; color: #1C1917; margin: 0 0 8px; }
        .delete-desc { font-size: 14px; color: #78716C; margin: 0 0 24px; line-height: 1.5; }
        .delete-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .btn-secondary {
          padding: 8px 20px; border-radius: 8px;
          border: 1.5px solid #D6D3D1; background: transparent;
          color: #57534E; font-size: 14px; cursor: pointer;
        }
        .btn-secondary:hover { background: #F5F5F4; }
        .btn-secondary:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .btn-danger {
          padding: 8px 20px; border-radius: 8px; border: none;
          background: #C86D5A; color: #FAFAF9;
          font-size: 14px; font-weight: 500; cursor: pointer;
        }
        .btn-danger:hover { background: #b85e4c; }
        .btn-danger:focus-visible { outline: 2px solid #C86D5A; outline-offset: 2px; }
        .btn-secondary:disabled, .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
