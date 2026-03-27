'use client';

import { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

interface Props {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteAccountDialog({ onConfirm, onCancel, isDeleting }: Props) {
  const [confirmed, setConfirmed] = useState('');
  const canDelete = confirmed === 'delete';

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dialog; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      style={overlayStyle}
      onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
    >
      <div ref={panelRef} style={dialogStyle}>
        <h2 id="delete-dialog-title" style={titleStyle}>Delete account?</h2>
        <p id="delete-dialog-desc" style={descStyle}>
          All your FlowSheets, entries, and settings will be permanently removed within 30 days.
          This action cannot be undone.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="confirm-delete" style={labelStyle}>
            Type <strong>delete</strong> to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmed}
            onChange={(e) => setConfirmed(e.target.value)}
            placeholder="delete"
            autoComplete="off"
            style={inputStyle}
            aria-required="true"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={cancelButtonStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
            style={deleteButtonStyle(!canDelete || isDeleting)}
            aria-label="Confirm account deletion"
          >
            {isDeleting ? 'Deleting\u2026' : 'Delete account'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: 16,
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 28,
  maxWidth: 420,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1C1917',
  margin: 0,
};

const descStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#78716C',
  margin: 0,
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#44403C',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  fontSize: 14,
  color: '#1C1917',
  outline: 'none',
  boxSizing: 'border-box',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 8,
  border: '1.5px solid #D6D3D1',
  backgroundColor: '#FFFFFF',
  color: '#44403C',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const deleteButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '9px 18px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: disabled ? '#E7E5E4' : '#C86D5A',
  color: disabled ? '#A8A29E' : '#FFFFFF',
  fontSize: 14,
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background 0.15s',
});
