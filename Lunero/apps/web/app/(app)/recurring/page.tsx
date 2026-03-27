'use client';

import { useState } from 'react';
import type { RecurringEntry, Category } from '@lunero/core';
import type { CreateRecurringEntryDto, UpdateRecurringEntryDto } from '@lunero/api-client';
import {
  useRecurringEntries,
  useCreateRecurringEntry,
  useUpdateRecurringEntry,
  useDeleteRecurringEntry,
  usePauseRecurringEntry,
  useResumeRecurringEntry,
} from '../../../lib/hooks/use-recurring';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProfile } from '../../../lib/hooks/use-profile';
import { RecurringEntryForm } from '../../../components/recurring/recurring-entry-form';
import { DeleteRecurringDialog } from '../../../components/recurring/delete-recurring-dialog';
import { formatCurrency, sortByLocale } from '../../../lib/locale-utils';

const TYPE_COLORS: Record<string, string> = {
  income: '#6B6F69',
  expense: '#C86D5A',
  savings: '#C4A484',
};

const TYPE_LABELS: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  savings: 'Savings',
};

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
};

const ENTRY_TYPES = ['income', 'expense', 'savings'] as const;

type ModalState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; entry: RecurringEntry }
  | { type: 'delete'; entry: RecurringEntry };

/** Single recurring entry row — pause/resume/edit/delete actions inline */
function RecurringEntryRow({
  entry,
  categoryName,
  onEdit,
  onDelete,
  onTogglePause,
  isTogglingPause,
}: {
  entry: RecurringEntry;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
  isTogglingPause: boolean;
}) {
  const typeColor = TYPE_COLORS[entry.entryType] ?? '#78716C';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid #F5F5F4',
        opacity: entry.isPaused ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
      aria-label={`${entry.isPaused ? 'Paused: ' : ''}${categoryName}, ${CADENCE_LABELS[entry.cadence]}, ${formatCurrency(entry.amount, entry.currency)}`}
    >
      <span
        style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor, flexShrink: 0 }}
        aria-hidden="true"
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: '#1C1917', display: 'block' }}>{categoryName}</span>
        {entry.note && (
          <span style={{ fontSize: 12, color: '#A8A29E', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.note}
          </span>
        )}
      </div>

      <span
        style={{
          fontSize: 11, fontWeight: 500, color: typeColor,
          background: `${typeColor}15`,
          padding: '3px 8px', borderRadius: 20,
          flexShrink: 0,
        }}
        aria-label={`Cadence: ${CADENCE_LABELS[entry.cadence]}`}
      >
        {CADENCE_LABELS[entry.cadence]}
      </span>

      <span
        style={{ fontSize: 14, fontWeight: 500, color: typeColor, flexShrink: 0, minWidth: 80, textAlign: 'right' }}
        aria-label={`Amount: ${formatCurrency(entry.amount, entry.currency)}`}
      >
        {formatCurrency(entry.amount, entry.currency)}
      </span>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onTogglePause}
          disabled={isTogglingPause}
          aria-label={entry.isPaused ? `Resume ${categoryName}` : `Pause ${categoryName}`}
          title={entry.isPaused ? 'Resume' : 'Pause'}
          style={{
            width: 30, height: 30, borderRadius: 6,
            border: '1.5px solid #E7E5E4', background: 'transparent',
            color: '#78716C', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isTogglingPause ? 0.5 : 1,
          }}
        >
          {entry.isPaused ? '▶' : '⏸'}
        </button>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${categoryName}`}
          title="Edit"
          style={{
            width: 30, height: 30, borderRadius: 6,
            border: '1.5px solid #E7E5E4', background: 'transparent',
            color: '#78716C', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✎
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${categoryName}`}
          title="Delete"
          style={{
            width: 30, height: 30, borderRadius: 6,
            border: '1.5px solid #E7E5E4', background: 'transparent',
            color: '#C86D5A', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** Wires pause/resume mutations per entry */
function RecurringEntryRowConnected({
  entry,
  categoryName,
  onEdit,
  onDelete,
}: {
  entry: RecurringEntry;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pause = usePauseRecurringEntry(entry.id);
  const resume = useResumeRecurringEntry(entry.id);

  return (
    <RecurringEntryRow
      entry={entry}
      categoryName={categoryName}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePause={() => (entry.isPaused ? resume.mutate() : pause.mutate())}
      isTogglingPause={pause.isPending || resume.isPending}
    />
  );
}

/** Wires update mutation for edit modal */
function EditEntryConnected({
  entry,
  categories,
  defaultCurrency,
  onClose,
}: {
  entry: RecurringEntry;
  categories: Category[];
  defaultCurrency: string;
  onClose: () => void;
}) {
  const update = useUpdateRecurringEntry(entry.id);

  return (
    <RecurringEntryForm
      mode="edit"
      entry={entry}
      categories={categories}
      defaultCurrency={defaultCurrency}
      onSubmit={async (data) => {
        await update.mutateAsync(data as UpdateRecurringEntryDto);
        onClose();
      }}
      onClose={onClose}
      isSubmitting={update.isPending}
    />
  );
}

/** Wires delete mutation for delete modal */
function DeleteEntryConnected({
  entry,
  onClose,
}: {
  entry: RecurringEntry;
  onClose: () => void;
}) {
  const del = useDeleteRecurringEntry(entry.id);

  return (
    <DeleteRecurringDialog
      onConfirm={async () => {
        await del.mutateAsync();
        onClose();
      }}
      onCancel={onClose}
      isDeleting={del.isPending}
    />
  );
}

export default function RecurringPage() {
  const { data: entries = [], isLoading, error } = useRecurringEntries();
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const createEntry = useCreateRecurringEntry();

  const [modal, setModal] = useState<ModalState>({ type: 'closed' });

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  // Group recurring entries by type; sort locale-aware by category name within each group (Requirement 15.4)
  const grouped = ENTRY_TYPES.reduce<Record<string, RecurringEntry[]>>((acc, type) => {
    const typeEntries = entries.filter((e) => e.entryType === type && !e.isDeleted);
    acc[type] = sortByLocale(typeEntries, (e) => categoryMap[e.categoryId] ?? '');
    return acc;
  }, {} as Record<string, RecurringEntry[]>);

  const totalEntries = entries.filter((e) => !e.isDeleted).length;

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading recurring entries"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontSize: 14, color: '#78716C' }}
      >
        Loading recurring entries…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontSize: 14, color: '#C86D5A' }}
      >
        Could not load recurring entries. Please refresh the page.
      </div>
    );
  }

  return (
    <main aria-label="Recurring entries" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1C1917', margin: 0 }}>Recurring</h1>
        <button
          type="button"
          onClick={() => setModal({ type: 'create' })}
          aria-label="Create new recurring entry"
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#44403C', color: '#FAFAF9',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          + New Recurring Entry
        </button>
      </div>

      {totalEntries === 0 && (
        <div
          style={{ padding: '40px 24px', borderRadius: 12, background: '#F5F5F4', textAlign: 'center' }}
          role="status"
        >
          <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 4px' }}>No recurring entries yet.</p>
          <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>
            Add entries that repeat on a regular cadence — they'll be pre-populated in each new FlowSheet.
          </p>
        </div>
      )}

      {totalEntries > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {ENTRY_TYPES.map((type) => {
            const typeEntries = grouped[type];
            const color = TYPE_COLORS[type];

            return (
              <section key={type} aria-label={`${TYPE_LABELS[type]} recurring entries`}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 4, paddingBottom: 8,
                    borderBottom: `2px solid ${color}30`,
                  }}
                >
                  <span
                    style={{ width: 10, height: 10, borderRadius: '50%', background: color }}
                    aria-hidden="true"
                  />
                  <h2 style={{ fontSize: 13, fontWeight: 600, color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {TYPE_LABELS[type]}
                  </h2>
                  <span style={{ fontSize: 12, color: '#A8A29E', marginLeft: 'auto' }}>
                    {typeEntries.length} {typeEntries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                {typeEntries.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#A8A29E', padding: '12px 0', margin: 0 }}>
                    No {TYPE_LABELS[type].toLowerCase()} recurring entries.
                  </p>
                ) : (
                  <div role="list" aria-label={`${TYPE_LABELS[type]} entries`}>
                    {typeEntries.map((entry) => (
                      <div key={entry.id} role="listitem">
                        <RecurringEntryRowConnected
                          entry={entry}
                          categoryName={categoryMap[entry.categoryId] ?? 'Unknown category'}
                          onEdit={() => setModal({ type: 'edit', entry })}
                          onDelete={() => setModal({ type: 'delete', entry })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {modal.type === 'create' && (
        <RecurringEntryForm
          mode="create"
          categories={categories}
          defaultCurrency={defaultCurrency}
          onSubmit={async (data) => {
            await createEntry.mutateAsync(data as CreateRecurringEntryDto);
            setModal({ type: 'closed' });
          }}
          onClose={() => setModal({ type: 'closed' })}
          isSubmitting={createEntry.isPending}
        />
      )}

      {modal.type === 'edit' && (
        <EditEntryConnected
          entry={modal.entry}
          categories={categories}
          defaultCurrency={defaultCurrency}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}

      {modal.type === 'delete' && (
        <DeleteEntryConnected
          entry={modal.entry}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}
    </main>
  );
}
