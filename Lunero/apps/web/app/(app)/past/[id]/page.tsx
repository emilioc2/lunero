'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BalanceDisplay, EntryRow } from '@lunero/ui';
import type { EntryFormValues } from '@lunero/ui';
import type { Entry, Category } from '@lunero/core';
import { useFlowSheet, useUnlockFlowSheet, flowSheetKeys } from '../../../lib/hooks/use-flow-sheets';
import { useEntries, useUpdateEntry, useDeleteEntry } from '../../../lib/hooks/use-entries';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProfile } from '../../../lib/hooks/use-profile';
import { useEntryStore } from '../../../lib/store/entry-store';
import { EntryList } from '../../../components/dashboard/entry-list';
import { EntryModal } from '../../../components/dashboard/entry-modal';
import { DeleteConfirmDialog } from '../../../components/dashboard/delete-confirm-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { formatPeriodLabel } from '../../../lib/locale-utils';

type ModalState =
  | { type: 'closed' }
  | { type: 'edit'; entry: Entry }
  | { type: 'delete'; entry: Entry }
  | { type: 'unlock-confirm' };

export default function PastFlowSheetDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const qc = useQueryClient();
  const { data: flowSheet, isLoading: sheetLoading, error: sheetError } = useFlowSheet(id);
  const { data: serverEntries = [], isLoading: entriesLoading } = useEntries(id);
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();

  const { entriesBySheet, updateEntry: updateStoreEntry, removeEntry, addEntry } = useEntryStore();
  const storeEntries: Entry[] = entriesBySheet[id] ?? serverEntries;

  const unlockSheet = useUnlockFlowSheet(id);
  const updateEntry = useUpdateEntry(id);
  const deleteEntry = useDeleteEntry(id);

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';
  const isUnlocked = flowSheet ? !flowSheet.editLocked : false;

  // ── Unlock ─────────────────────────────────────────────────────────────────

  const handleUnlockConfirm = useCallback(async () => {
    setUnlockError(null);
    try {
      await unlockSheet.mutateAsync();
      setModal({ type: 'closed' });
    } catch {
      setUnlockError('Could not unlock this FlowSheet. Please try again.');
    }
  }, [unlockSheet]);

  // ── Edit entry ─────────────────────────────────────────────────────────────

  const handleEdit = useCallback(
    async (values: EntryFormValues) => {
      if (modal.type !== 'edit') return;
      const entry = modal.entry;
      const dto = {
        categoryId: values.categoryId,
        amount: parseFloat(values.amount),
        currency: values.currency,
        entryDate: values.entryDate,
        note: values.note || undefined,
        clientUpdatedAt: new Date().toISOString(),
      };

      updateStoreEntry({ ...entry, ...dto, amount: dto.amount });
      setModal({ type: 'closed' });

      try {
        const updated = await updateEntry.mutateAsync({ id: entry.id, data: dto });
        updateStoreEntry(updated);
        qc.invalidateQueries({ queryKey: flowSheetKeys.detail(id) });
      } catch {
        updateStoreEntry(entry);
      }
    },
    [modal, updateStoreEntry, updateEntry, qc, id],
  );

  // ── Delete entry ───────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (modal.type !== 'delete') return;
    const entry = modal.entry;

    removeEntry(id, entry.id);
    setModal({ type: 'closed' });

    try {
      await deleteEntry.mutateAsync(entry.id);
      qc.invalidateQueries({ queryKey: flowSheetKeys.detail(id) });
    } catch {
      addEntry(entry);
    }
  }, [modal, id, removeEntry, addEntry, deleteEntry, qc]);

  // ── Loading / error ────────────────────────────────────────────────────────

  if (sheetLoading || entriesLoading) {
    return (
      <div role="status" aria-label="Loading FlowSheet" className="pd-state">
        <span>Loading FlowSheet…</span>
      </div>
    );
  }

  if (sheetError || !flowSheet) {
    return (
      <div role="alert" className="pd-state pd-state--error">
        <p>Could not load this FlowSheet.</p>
        <Link href="/past" className="pd-back">← Back to Past FlowSheets</Link>
      </div>
    );
  }

  const periodLabel = formatPeriodLabel(flowSheet.startDate, flowSheet.endDate);

  return (
    <main className="pd" aria-label={`Past FlowSheet: ${periodLabel}`}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <Link href="/past" className="pd-back">← Past FlowSheets</Link>
      </nav>

      {/* Header */}
      <div className="pd-header">
        <div>
          <p className="pd-period">{periodLabel}</p>
          <div className="pd-badges">
            <span className="pd-badge" aria-label="Archived">Archived</span>
            {isUnlocked && (
              <span className="pd-badge pd-badge--unlocked" aria-label="Unlocked for editing">
                Unlocked
              </span>
            )}
          </div>
        </div>

        {!isUnlocked && (
          <button
            type="button"
            onClick={() => setModal({ type: 'unlock-confirm' })}
            aria-label="Unlock this FlowSheet for editing"
            className="pd-unlock-btn"
          >
            Unlock to Edit
          </button>
        )}
      </div>

      {/* Balance */}
      <section aria-label="Balance summary" className="pd-balance">
        <BalanceDisplay
          availableBalance={flowSheet.availableBalance}
          totalIncome={flowSheet.totalIncome}
          totalExpenses={flowSheet.totalExpenses}
          totalSavings={flowSheet.totalSavings}
          currency={defaultCurrency}
        />
      </section>

      {/* Entries */}
      <section aria-label="Entries" className="pd-entries">
        <h2 className="pd-entries-title">Entries</h2>

        {isUnlocked ? (
          <EntryList
            entries={storeEntries}
            categories={categories}
            defaultCurrency={defaultCurrency}
            onEdit={(entry) => setModal({ type: 'edit', entry })}
            onDelete={(entry) => setModal({ type: 'delete', entry })}
          />
        ) : (
          <ReadOnlyEntryList
            entries={storeEntries}
            categories={categories}
            defaultCurrency={defaultCurrency}
          />
        )}
      </section>

      {/* Unlock confirmation */}
      {modal.type === 'unlock-confirm' && (
        <UnlockConfirmDialog
          periodLabel={periodLabel}
          isUnlocking={unlockSheet.isPending}
          error={unlockError}
          onConfirm={handleUnlockConfirm}
          onCancel={() => { setModal({ type: 'closed' }); setUnlockError(null); }}
        />
      )}

      {/* Edit modal */}
      {modal.type === 'edit' && (
        <EntryModal
          mode="edit"
          entry={modal.entry}
          categories={categories}
          defaultCurrency={defaultCurrency}
          onSubmit={handleEdit}
          onClose={() => setModal({ type: 'closed' })}
          isSubmitting={updateEntry.isPending}
        />
      )}

      {/* Delete confirmation */}
      {modal.type === 'delete' && (
        <DeleteConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setModal({ type: 'closed' })}
          isDeleting={deleteEntry.isPending}
        />
      )}

      <style>{`
        .pd { display: flex; flex-direction: column; gap: 28px; max-width: 720px; }
        .pd-back {
          font-size: 13px; color: #78716C; text-decoration: none;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .pd-back:hover { color: #1C1917; }
        .pd-back:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; border-radius: 4px; }
        .pd-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .pd-period { font-size: 13px; color: #A8A29E; letter-spacing: 0.3px; margin: 0 0 8px; }
        .pd-badges { display: flex; gap: 8px; align-items: center; }
        .pd-badge {
          display: inline-block; padding: 3px 10px; border-radius: 99px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;
          background: #F5F5F4; color: #78716C;
        }
        .pd-badge--unlocked { background: #FDF2F0; color: #C86D5A; }
        .pd-unlock-btn {
          padding: 8px 18px; border-radius: 8px;
          border: 1px solid #D6D3D1; background: transparent;
          color: #44403C; font-size: 14px; font-weight: 500; cursor: pointer;
          white-space: nowrap; flex-shrink: 0; transition: background 0.15s, border-color 0.15s;
        }
        .pd-unlock-btn:hover { background: #F5F5F4; border-color: #A8A29E; }
        .pd-unlock-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .pd-balance { background: #FFFFFF; border: 1px solid #E7E5E4; border-radius: 12px; padding: 28px 24px; }
        .pd-entries { display: flex; flex-direction: column; gap: 16px; }
        .pd-entries-title { font-size: 15px; font-weight: 500; color: #1C1917; margin: 0; }
        .pd-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 16px; min-height: 200px; font-size: 14px; color: #78716C;
        }
        .pd-state--error { color: #C86D5A; }
      `}</style>
    </main>
  );
}

// ── Read-only entry list ───────────────────────────────────────────────────

interface ReadOnlyEntryListProps {
  entries: Entry[];
  categories: Category[];
  defaultCurrency?: string;
}

function ReadOnlyEntryList({ entries, categories, defaultCurrency }: ReadOnlyEntryListProps) {
  const visible = entries.filter((e) => !e.isDeleted);

  if (visible.length === 0) {
    return <p style={{ fontSize: 14, color: '#A8A29E', margin: 0 }}>No entries in this FlowSheet.</p>;
  }

  return (
    <div role="list" aria-label="Entries (read-only)">
      {visible.map((entry: Entry) => {
        const categoryName = categories.find((c: Category) => c.id === entry.categoryId)?.name ?? 'Unknown';
        return (
          <div
            key={entry.id}
            role="listitem"
            style={{ borderBottom: '1px solid #E7E5E4' }}
          >
            <EntryRow
              id={entry.id}
              amount={entry.amount}
              convertedAmount={entry.convertedAmount}
              currency={entry.currency}
              defaultCurrency={defaultCurrency}
              entryType={entry.entryType}
              categoryName={categoryName}
              entryDate={entry.entryDate}
              note={entry.note}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Unlock confirmation dialog ─────────────────────────────────────────────

interface UnlockConfirmDialogProps {
  periodLabel: string;
  isUnlocking: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function UnlockConfirmDialog({ periodLabel, isUnlocking, error, onConfirm, onCancel }: UnlockConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock FlowSheet"
      className="ul-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="ul-panel">
        <h2 className="ul-title">Unlock FlowSheet?</h2>
        <p className="ul-body">
          This will allow you to edit entries in <strong>{periodLabel}</strong>.
          The sheet will re-lock automatically after you save.
        </p>

        {error && <p role="alert" className="ul-error">{error}</p>}

        <div className="ul-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUnlocking}
            className="ul-btn ul-btn--cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUnlocking}
            aria-busy={isUnlocking}
            className="ul-btn ul-btn--confirm"
          >
            {isUnlocking ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      </div>

      <style>{`
        .ul-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 16px;
        }
        .ul-panel {
          background: #FAFAF9; border-radius: 12px; padding: 28px 24px;
          width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .ul-title { font-size: 17px; font-weight: 500; color: #1C1917; margin: 0 0 12px; }
        .ul-body { font-size: 14px; color: #78716C; line-height: 1.6; margin: 0 0 20px; }
        .ul-error { font-size: 13px; color: #C86D5A; margin: 0 0 16px; }
        .ul-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .ul-btn {
          padding: 8px 20px; border-radius: 8px; font-size: 14px;
          font-weight: 500; cursor: pointer; border: 1px solid transparent;
          transition: background 0.15s;
        }
        .ul-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ul-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .ul-btn--cancel { background: transparent; border-color: #D6D3D1; color: #44403C; }
        .ul-btn--cancel:hover:not(:disabled) { background: #F5F5F4; }
        .ul-btn--confirm { background: #44403C; color: #FAFAF9; border-color: #44403C; }
        .ul-btn--confirm:hover:not(:disabled) { background: #292524; }
      `}</style>
    </div>
  );
}
