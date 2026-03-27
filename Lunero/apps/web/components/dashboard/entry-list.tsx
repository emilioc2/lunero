'use client';

import { EntryRow } from '@lunero/ui';
import type { Entry, Category } from '@lunero/core';

interface EntryListProps {
  entries: Entry[];
  categories: Category[];
  defaultCurrency?: string;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

function getCategoryName(categories: Category[], categoryId: string): string {
  return categories.find((c) => c.id === categoryId)?.name ?? 'Unknown';
}

/**
 * Renders the list of entries for the active FlowSheet.
 * Each row exposes Edit and Delete actions via keyboard-accessible buttons.
 */
export function EntryList({ entries, categories, defaultCurrency, onEdit, onDelete }: EntryListProps) {
  const visible = entries.filter((e) => !e.isDeleted);

  if (visible.length === 0) {
    return (
      <p className="entry-list-empty" aria-live="polite">
        No entries yet. Add your first income, expense, or savings entry above.
      </p>
    );
  }

  return (
    <div role="list" aria-label="Entries" className="entry-list">
      {visible.map((entry) => (
        <div key={entry.id} className="entry-list-item" role="listitem">
          <EntryRow
            id={entry.id}
            amount={entry.amount}
            convertedAmount={entry.convertedAmount}
            currency={entry.currency}
            defaultCurrency={defaultCurrency}
            entryType={entry.entryType}
            categoryName={getCategoryName(categories, entry.categoryId)}
            entryDate={entry.entryDate}
            note={entry.note}
          />
          <div
            className="entry-list-actions"
            role="group"
            aria-label={`Actions for entry on ${entry.entryDate}`}
          >
            <button
              type="button"
              onClick={() => onEdit(entry)}
              aria-label={`Edit ${entry.entryType} entry`}
              className="entry-action-btn"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry)}
              aria-label={`Delete ${entry.entryType} entry`}
              className="entry-action-btn entry-action-btn--danger"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <style>{`
        .entry-list { display: flex; flex-direction: column; }
        .entry-list-item {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; border-bottom: 1px solid #E7E5E4;
        }
        .entry-list-item:last-child { border-bottom: none; }
        .entry-list-item > * { flex: 1; min-width: 0; border-bottom: none !important; }
        .entry-list-actions { display: flex; gap: 4px; flex-shrink: 0; padding: 8px 0; flex: 0 !important; }
        .entry-action-btn {
          padding: 4px 10px; border-radius: 6px;
          border: 1px solid #D6D3D1; background: transparent;
          color: #78716C; font-size: 12px; cursor: pointer; white-space: nowrap;
        }
        .entry-action-btn:hover { background: #F5F5F4; }
        .entry-action-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .entry-action-btn--danger { color: #C86D5A; border-color: #C86D5A; }
        .entry-action-btn--danger:hover { background: #FDF2F0; }
        .entry-action-btn--danger:focus-visible { outline-color: #C86D5A; }
        .entry-list-empty {
          font-size: 14px; color: #A8A29E;
          text-align: center; padding: 32px 0; margin: 0;
        }
      `}</style>
    </div>
  );
}
