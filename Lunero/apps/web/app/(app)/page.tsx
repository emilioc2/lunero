'use client';

import { useState, useCallback } from 'react';
import { BalanceDisplay, ProjectionSummaryPanel } from '@lunero/ui';
import type { EntryFormValues } from '@lunero/ui';
import type { Entry } from '@lunero/core';
import { useActiveFlowSheet } from '../../lib/hooks/use-flow-sheets';
import { useEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../../lib/hooks/use-entries';
import { useCategories } from '../../lib/hooks/use-categories';
import { useProfile } from '../../lib/hooks/use-profile';
import { useProjectionSummary } from '../../lib/hooks/use-projections';
import { useEntryStore } from '../../lib/store/entry-store';
import { formatPeriodLabel } from '../../lib/locale-utils';
import { EntryModal } from '../../components/dashboard/entry-modal';
import { DeleteConfirmDialog } from '../../components/dashboard/delete-confirm-dialog';
import { EntryList } from '../../components/dashboard/entry-list';
import { RecurringSuggestionBanner } from '../../components/dashboard/recurring-suggestion-banner';

type ModalState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; entry: Entry }
  | { type: 'delete'; entry: Entry };

export default function DashboardPage() {
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  // Tracks dismissed recurring suggestions by category id
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const { data: profile } = useProfile();
  const { data: flowSheet, isLoading: sheetLoading, error: sheetError } = useActiveFlowSheet();
  const { data: serverEntries = [], isLoading: entriesLoading } = useEntries(flowSheet?.id ?? '');
  const { data: categories = [] } = useCategories();
  const { data: projectionSummary } = useProjectionSummary(flowSheet?.id ?? '');

  // Zustand store for optimistic entry state
  const { entriesBySheet, setEntries, addEntry, updateEntry: updateStoreEntry, removeEntry } = useEntryStore();

  // Sync server entries into store when they arrive
  const storeEntries: Entry[] = flowSheet ? (entriesBySheet[flowSheet.id] ?? serverEntries) : serverEntries;

  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry(flowSheet?.id ?? '');
  const deleteEntry = useDeleteEntry(flowSheet?.id ?? '');

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    async (values: EntryFormValues) => {
      if (!flowSheet) return;
      const dto = {
        flowSheetId: flowSheet.id,
        entryType: values.entryType,
        categoryId: values.categoryId,
        amount: parseFloat(values.amount),
        currency: values.currency,
        entryDate: values.entryDate,
        note: values.note || undefined,
        clientUpdatedAt: new Date().toISOString(),
      };

      // Optimistic add — temporary id replaced on server response
      const optimisticEntry: Entry = {
        ...dto,
        id: `optimistic-${Date.now()}`,
        userId: '',
        convertedAmount: undefined,
        conversionRate: undefined,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addEntry(optimisticEntry);
      setModal({ type: 'closed' });

      try {
        const created = await createEntry.mutateAsync(dto);
        // Replace optimistic entry with real one
        setEntries(flowSheet.id, [
          ...storeEntries.filter((e) => e.id !== optimisticEntry.id),
          created,
        ]);
      } catch {
        // Roll back optimistic entry on failure
        removeEntry(flowSheet.id, optimisticEntry.id);
      }
    },
    [flowSheet, storeEntries, addEntry, setEntries, removeEntry, createEntry],
  );

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

      // Optimistic update
      updateStoreEntry({ ...entry, ...dto, amount: dto.amount });
      setModal({ type: 'closed' });

      try {
        const updated = await updateEntry.mutateAsync({ id: entry.id, data: dto });
        updateStoreEntry(updated);
      } catch {
        // Roll back to original
        updateStoreEntry(entry);
      }
    },
    [modal, updateStoreEntry, updateEntry],
  );

  const handleDelete = useCallback(async () => {
    if (modal.type !== 'delete' || !flowSheet) return;
    const entry = modal.entry;

    // Optimistic remove
    removeEntry(flowSheet.id, entry.id);
    setModal({ type: 'closed' });

    try {
      await deleteEntry.mutateAsync(entry.id);
    } catch {
      // Roll back
      addEntry(entry);
    }
  }, [modal, flowSheet, removeEntry, addEntry, deleteEntry]);

  // ── Recurring suggestion detection ────────────────────────────────────────
  // The backend flags recurring patterns via a `recurringPatternDetected` field
  // on entries. We surface the first undismissed suggestion.
  type EntryWithSuggestion = Entry & { recurringPatternDetected?: boolean };
  const suggestedEntry = (storeEntries as EntryWithSuggestion[]).find(
    (e: EntryWithSuggestion) =>
      !e.isDeleted &&
      e.recurringPatternDetected === true &&
      !dismissedSuggestions.has(e.categoryId),
  );
  const suggestedCategory = suggestedEntry
    ? categories.find((c) => c.id === suggestedEntry.categoryId)
    : undefined;

  // ── Loading / error states ─────────────────────────────────────────────────

  if (sheetLoading || entriesLoading) {
    return (
      <div role="status" aria-label="Loading dashboard" className="dashboard-loading">
        <span>Loading your FlowSheet…</span>
      </div>
    );
  }

  if (sheetError || !flowSheet) {
    return (
      <div role="alert" className="dashboard-error">
        <p>Could not load your active FlowSheet. Please refresh the page.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="dashboard" aria-label="Dashboard">
      {/* Period label */}
      <p className="dashboard-period" aria-label={`Current period: ${formatPeriodLabel(flowSheet.startDate, flowSheet.endDate)}`}>
        {formatPeriodLabel(flowSheet.startDate, flowSheet.endDate)}
      </p>

      {/* Balance summary */}
      <section aria-label="Balance summary" className="dashboard-balance">
        <BalanceDisplay
          availableBalance={flowSheet.availableBalance}
          totalIncome={flowSheet.totalIncome}
          totalExpenses={flowSheet.totalExpenses}
          totalSavings={flowSheet.totalSavings}
          currency={defaultCurrency}
        />
      </section>

      {/* Projection summary — clearly separated from Available Balance (actuals only) */}
      {projectionSummary && (
        <section aria-label="Budget projections">
          <ProjectionSummaryPanel summary={projectionSummary} currency={defaultCurrency} />
        </section>
      )}

      {/* Recurring suggestion banner */}
      {suggestedCategory && suggestedEntry && (
        <RecurringSuggestionBanner
          categoryName={suggestedCategory.name}
          onConvert={() => {
            // Navigate to recurring entries page — full implementation in task 24
            window.location.href = '/recurring';
          }}
          onDismiss={() =>
            setDismissedSuggestions((prev) => new Set([...prev, suggestedEntry.categoryId]))
          }
        />
      )}

      {/* Entry list header + add button */}
      <section aria-label="Entries" className="dashboard-entries">
        <div className="dashboard-entries-header">
          <h2 className="dashboard-entries-title">Entries</h2>
          <button
            type="button"
            onClick={() => setModal({ type: 'create' })}
            aria-label="Add new entry"
            className="dashboard-add-btn"
          >
            + Add Entry
          </button>
        </div>

        <EntryList
          entries={storeEntries}
          categories={categories}
          defaultCurrency={defaultCurrency}
          onEdit={(entry) => setModal({ type: 'edit', entry })}
          onDelete={(entry) => setModal({ type: 'delete', entry })}
        />
      </section>

      {/* Modals */}
      {modal.type === 'create' && (
        <EntryModal
          mode="create"
          categories={categories}
          defaultCurrency={defaultCurrency}
          onSubmit={handleCreate}
          onClose={() => setModal({ type: 'closed' })}
          isSubmitting={createEntry.isPending}
        />
      )}

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

      {modal.type === 'delete' && (
        <DeleteConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setModal({ type: 'closed' })}
          isDeleting={deleteEntry.isPending}
        />
      )}

      <style>{`
        .dashboard {
          display: flex; flex-direction: column; gap: 32px;
          max-width: 720px;
        }
        .dashboard-period {
          font-size: 13px; color: #A8A29E;
          letter-spacing: 0.5px; margin: 0;
        }
        .dashboard-balance {
          background: #FFFFFF; border: 1px solid #E7E5E4;
          border-radius: 12px; padding: 28px 24px;
        }
        .dashboard-entries { display: flex; flex-direction: column; gap: 16px; }
        .dashboard-entries-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .dashboard-entries-title {
          font-size: 15px; font-weight: 500; color: #1C1917; margin: 0;
        }
        .dashboard-add-btn {
          padding: 8px 18px; border-radius: 8px; border: none;
          background: #44403C; color: #FAFAF9;
          font-size: 14px; font-weight: 500; cursor: pointer;
        }
        .dashboard-add-btn:hover { background: #292524; }
        .dashboard-add-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .dashboard-loading, .dashboard-error {
          display: flex; align-items: center; justify-content: center;
          min-height: 200px; font-size: 14px; color: #78716C;
        }
        .dashboard-error { color: #C86D5A; }
      `}</style>
    </main>
  );
}
