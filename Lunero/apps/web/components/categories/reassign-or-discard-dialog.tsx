'use client';

import { useState, useEffect, useRef } from 'react';
import type { Category } from '@lunero/core';
import { useDeleteCategory, useReassignCategory } from '../../lib/hooks/use-categories';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

const TYPE_COLORS: Record<string, string> = {
  income: '#6B6F69',
  expense: '#C86D5A',
  savings: '#C4A484',
};

interface ReassignOrDiscardDialogProps {
  category: Category;
  /** Full category list — used to populate the reassign target selector */
  categories: Category[];
  onClose: () => void;
}

/**
 * Handles category deletion (Requirement 3.6 / 3.7):
 * - If no entries exist -> simple confirm delete
 * - If entries exist -> offer reassign to another category OR discard all entries
 */
export function ReassignOrDiscardDialog({ category, categories, onClose }: ReassignOrDiscardDialogProps) {
  const [step, setStep] = useState<'confirm' | 'reassign'>('confirm');
  const [mode, setMode] = useState<'reassign' | 'discard'>('reassign');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');

  const deleteMutation = useDeleteCategory(category.id);
  const reassignMutation = useReassignCategory(category.id);

  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dialog; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Candidates for reassignment: same entry type, not the category being deleted
  const candidates = categories.filter(
    (c) => c.id !== category.id && c.entryType === category.entryType,
  );

  const handleConfirmDelete = async () => {
    setError('');
    try {
      await deleteMutation.mutateAsync();
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setStep('reassign');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const handleReassignOrDiscard = async () => {
    setError('');
    if (mode === 'reassign') {
      if (!targetId) {
        setError('Please select a category to reassign entries to.');
        return;
      }
      try {
        await reassignMutation.mutateAsync({ targetCategoryId: targetId });
        await deleteMutation.mutateAsync();
        onClose();
      } catch {
        setError('Something went wrong. Please try again.');
      }
    } else {
      try {
        await deleteMutation.mutateAsync();
        onClose();
      } catch {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const isPending = deleteMutation.isPending || reassignMutation.isPending;
  const dotColor = TYPE_COLORS[category.entryType] ?? '#A8A29E';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-cat-title"
      aria-describedby="del-cat-desc"
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
          padding: '28px 24px', width: '100%', maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Category name header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1C1917' }}>{category.name}</span>
        </div>

        {step === 'confirm' && (
          <>
            <p id="del-cat-title" style={{ fontSize: 16, fontWeight: 500, color: '#1C1917', margin: '0 0 8px' }}>
              Delete category?
            </p>
            <p id="del-cat-desc" style={{ fontSize: 14, color: '#78716C', margin: '0 0 24px', lineHeight: 1.5 }}>
              This will permanently remove the category. If entries are assigned to it, you&apos;ll be asked what to do with them.
            </p>
          </>
        )}

        {step === 'reassign' && (
          <>
            <p id="del-cat-title" style={{ fontSize: 16, fontWeight: 500, color: '#1C1917', margin: '0 0 8px' }}>
              This category has entries
            </p>
            <p id="del-cat-desc" style={{ fontSize: 14, color: '#78716C', margin: '0 0 20px', lineHeight: 1.5 }}>
              Choose what to do with the entries assigned to <strong>{category.name}</strong> before deleting it.
            </p>

            <div role="radiogroup" aria-label="What to do with entries" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <label style={radioLabelStyle(mode === 'reassign')}>
                <input
                  type="radio"
                  name="deleteMode"
                  value="reassign"
                  checked={mode === 'reassign'}
                  onChange={() => { setMode('reassign'); setError(''); }}
                  style={{ accentColor: '#44403C' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1917' }}>Reassign entries</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Move all entries to another category</div>
                </div>
              </label>

              <label style={radioLabelStyle(mode === 'discard')}>
                <input
                  type="radio"
                  name="deleteMode"
                  value="discard"
                  checked={mode === 'discard'}
                  onChange={() => { setMode('discard'); setError(''); }}
                  style={{ accentColor: '#C86D5A' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#C86D5A' }}>Discard all entries</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Permanently delete all entries in this category</div>
                </div>
              </label>
            </div>

            {mode === 'reassign' && (
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="reassign-target"
                  style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#57534E', marginBottom: 6 }}
                >
                  Reassign to
                </label>
                {candidates.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>
                    No other {category.entryType} categories available. Create one first or choose discard.
                  </p>
                ) : (
                  <select
                    id="reassign-target"
                    value={targetId}
                    onChange={(e) => { setTargetId(e.target.value); setError(''); }}
                    aria-required="true"
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: `1.5px solid ${error && !targetId ? '#C86D5A' : '#D6D3D1'}`,
                      fontSize: 14, color: '#1C1917', background: '#FFFFFF',
                      outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="">Select a category\u2026</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#C86D5A', margin: '0 0 16px' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1.5px solid #D6D3D1', background: 'transparent',
              color: '#57534E', fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={step === 'confirm' ? handleConfirmDelete : handleReassignOrDiscard}
            disabled={isPending || (step === 'reassign' && mode === 'reassign' && candidates.length === 0)}
            aria-busy={isPending}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: step === 'reassign' && mode === 'discard' ? '#C86D5A' : '#44403C',
              color: '#FAFAF9', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending
              ? 'Working\u2026'
              : step === 'confirm'
              ? 'Delete'
              : mode === 'reassign'
              ? 'Reassign & Delete'
              : 'Discard & Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function radioLabelStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
    border: `1.5px solid ${selected ? '#44403C' : '#E7E5E4'}`,
    background: selected ? '#F5F5F4' : '#FFFFFF',
    transition: 'border-color 0.15s, background 0.15s',
  };
}
