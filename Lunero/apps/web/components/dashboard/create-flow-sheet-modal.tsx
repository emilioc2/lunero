'use client';

import { useState, useEffect, useRef } from 'react';
import type { Category, CategoryProjection } from '@lunero/core';
import type { CreateFlowSheetDto } from '@lunero/api-client';
import { useFocusTrap } from '../../lib/hooks/use-focus-trap';

export interface ProjectionDraft {
  categoryId: string;
  categoryName: string;
  projectedAmount: number;
  currency: string;
}

interface CreateFlowSheetModalProps {
  categories: Category[];
  carriedProjections: CategoryProjection[];
  currency: string;
  isSubmitting: boolean;
  onSubmit: (dto: CreateFlowSheetDto, projections: ProjectionDraft[]) => Promise<void>;
  onClose: () => void;
}

export function CreateFlowSheetModal({
  categories,
  carriedProjections,
  currency,
  isSubmitting,
  onSubmit,
  onClose,
}: CreateFlowSheetModalProps) {
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [projectionDrafts, setProjectionDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    carriedProjections.forEach((p) => {
      init[p.categoryId] = String(p.projectedAmount);
    });
    return init;
  });
  const [projectionErrors, setProjectionErrors] = useState<Record<string, string>>({});

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the modal; restores focus to trigger on unmount
  useFocusTrap(panelRef);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-compute start/end for weekly and monthly
  useEffect(() => {
    const today = new Date();
    if (periodType === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(start.toISOString().split('T')[0] ?? '');
      setEndDate(end.toISOString().split('T')[0] ?? '');
    } else if (periodType === 'weekly') {
      const day = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setStartDate(start.toISOString().split('T')[0] ?? '');
      setEndDate(end.toISOString().split('T')[0] ?? '');
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [periodType]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (periodType === 'custom') {
      if (!startDate) errs.startDate = 'Start date is required';
      if (!endDate) errs.endDate = 'End date is required';
      if (startDate && endDate && startDate >= endDate) {
        errs.endDate = 'End date must be after start date';
      }
    }
    const projErrs: Record<string, string> = {};
    Object.entries(projectionDrafts).forEach(([catId, val]) => {
      if (val.trim() === '') return;
      const parsed = parseFloat(val);
      if (isNaN(parsed) || parsed <= 0) {
        projErrs[catId] = 'Must be greater than 0';
      }
    });
    setErrors(errs);
    setProjectionErrors(projErrs);
    return Object.keys(errs).length === 0 && Object.keys(projErrs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dto: CreateFlowSheetDto = { periodType, startDate, endDate };

    const drafts: ProjectionDraft[] = Object.entries(projectionDrafts)
      .filter(([, val]) => val.trim() !== '' && parseFloat(val) > 0)
      .map(([categoryId, val]) => {
        const cat = categories.find((c) => c.id === categoryId);
        return {
          categoryId,
          categoryName: cat?.name ?? '',
          projectedAmount: parseFloat(val),
          currency,
        };
      });

    await onSubmit(dto, drafts);
  };

  const categoriesWithProjections = categories.filter(
    (c) => carriedProjections.some((p) => p.categoryId === c.id) || projectionDrafts[c.id],
  );

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Create new FlowSheet"
      className="csm-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div ref={panelRef} className="csm-panel">
        <div className="csm-header">
          <h2 className="csm-title">New FlowSheet</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="csm-close">&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="csm-fieldset">
            <legend className="csm-legend">Period type</legend>
            <div className="csm-radio-group" role="radiogroup">
              {(['weekly', 'monthly', 'custom'] as const).map((type) => (
                <label key={type} className="csm-radio-label">
                  <input
                    type="radio"
                    name="periodType"
                    value={type}
                    checked={periodType === type}
                    onChange={() => setPeriodType(type)}
                    className="csm-radio"
                  />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          {periodType === 'custom' && (
            <div className="csm-date-row">
              <div className="csm-field">
                <label htmlFor="csm-start" className="csm-label">Start date</label>
                <input
                  id="csm-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-invalid={!!errors.startDate}
                  aria-describedby={errors.startDate ? 'csm-start-err' : undefined}
                  className="csm-input"
                />
                {errors.startDate && (
                  <span id="csm-start-err" role="alert" className="csm-error">{errors.startDate}</span>
                )}
              </div>
              <div className="csm-field">
                <label htmlFor="csm-end" className="csm-label">End date</label>
                <input
                  id="csm-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-invalid={!!errors.endDate}
                  aria-describedby={errors.endDate ? 'csm-end-err' : undefined}
                  className="csm-input"
                />
                {errors.endDate && (
                  <span id="csm-end-err" role="alert" className="csm-error">{errors.endDate}</span>
                )}
              </div>
            </div>
          )}

          {categoriesWithProjections.length > 0 && (
            <div className="csm-projections">
              <p className="csm-projections-label">
                Projected amounts carried over from your last period &mdash; adjust or clear as needed.
              </p>
              <div className="csm-proj-list" role="list">
                {categoriesWithProjections.map((cat) => (
                  <div key={cat.id} className="csm-proj-row" role="listitem">
                    <label htmlFor={`proj-${cat.id}`} className="csm-proj-name">{cat.name}</label>
                    <div className="csm-proj-input-wrap">
                      <input
                        id={`proj-${cat.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="No projection"
                        value={projectionDrafts[cat.id] ?? ''}
                        onChange={(e) => {
                          setProjectionDrafts((prev) => ({ ...prev, [cat.id]: e.target.value }));
                          setProjectionErrors((prev) => { const n = { ...prev }; delete n[cat.id]; return n; });
                        }}
                        aria-label={`Projected amount for ${cat.name}`}
                        aria-invalid={!!projectionErrors[cat.id]}
                        aria-describedby={projectionErrors[cat.id] ? `proj-err-${cat.id}` : undefined}
                        className="csm-proj-input"
                      />
                      {projectionErrors[cat.id] && (
                        <span id={`proj-err-${cat.id}`} role="alert" className="csm-error">
                          {projectionErrors[cat.id]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="csm-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="csm-btn csm-btn--cancel">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="csm-btn csm-btn--submit">
              {isSubmitting ? 'Creating\u2026' : 'Create FlowSheet'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .csm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 16px;
        }
        .csm-panel {
          background: #FAFAF9; border-radius: 12px; padding: 28px 24px;
          width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .csm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .csm-title { font-size: 17px; font-weight: 500; color: #1C1917; margin: 0; }
        .csm-close { background: none; border: none; cursor: pointer; font-size: 16px; color: #A8A29E; padding: 4px; border-radius: 4px; }
        .csm-close:hover { color: #1C1917; }
        .csm-close:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .csm-fieldset { border: none; padding: 0; margin: 0 0 20px; }
        .csm-legend { font-size: 13px; font-weight: 500; color: #44403C; margin-bottom: 10px; }
        .csm-radio-group { display: flex; gap: 16px; }
        .csm-radio-label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #1C1917; cursor: pointer; }
        .csm-radio { accent-color: #44403C; }
        .csm-date-row { display: flex; gap: 12px; margin-bottom: 20px; }
        .csm-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .csm-label { font-size: 13px; font-weight: 500; color: #44403C; }
        .csm-input { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #D6D3D1; font-size: 14px; color: #1C1917; background: #FFFFFF; outline: none; }
        .csm-input:focus { border-color: #44403C; }
        .csm-error { font-size: 12px; color: #C86D5A; }
        .csm-projections { margin-bottom: 24px; }
        .csm-projections-label { font-size: 13px; color: #78716C; margin: 0 0 12px; line-height: 1.5; }
        .csm-proj-list { display: flex; flex-direction: column; gap: 10px; }
        .csm-proj-row { display: flex; align-items: center; gap: 12px; }
        .csm-proj-name { font-size: 14px; color: #1C1917; flex: 1; min-width: 0; }
        .csm-proj-input-wrap { display: flex; flex-direction: column; gap: 2px; }
        .csm-proj-input { width: 110px; padding: 6px 10px; border-radius: 6px; border: 1.5px solid #D6D3D1; font-size: 13px; color: #1C1917; background: #FFFFFF; outline: none; }
        .csm-proj-input:focus { border-color: #44403C; }
        .csm-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
        .csm-btn { padding: 9px 22px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: background 0.15s; }
        .csm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .csm-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .csm-btn--cancel { background: transparent; border-color: #D6D3D1; color: #44403C; }
        .csm-btn--cancel:hover:not(:disabled) { background: #F5F5F4; }
        .csm-btn--submit { background: #44403C; color: #FAFAF9; border-color: #44403C; }
        .csm-btn--submit:hover:not(:disabled) { background: #292524; }
      `}</style>
    </div>
  );
}
