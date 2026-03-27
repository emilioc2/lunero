'use client';

import { useState, useCallback } from 'react';
import type { Category, CategoryProjection } from '@lunero/core';
import { useUpdateCategory } from '../../lib/hooks/use-categories';
import { useUpsertProjection, useDeleteProjection } from '../../lib/hooks/use-projections';

interface CategoryGroupProps {
  type: string;
  categories: Category[];
  color: string;
  label: string;
  onDeleteRequest: (cat: Category) => void;
  projections?: Record<string, CategoryProjection>;
  flowSheetId?: string;
  currency?: string;
}

/**
 * Renders a single entry-type group (Income / Expense / Savings) with:
 * - Type color indicator and count badge (23.1)
 * - Inline rename per row (23.3)
 * - Drag-to-reorder within the group (23.5)
 * - Keyboard reordering via arrow keys (a11y alternative to drag)
 * - Delete button that delegates to parent for the reassign/discard dialog (23.4)
 */
export function CategoryGroup({ type, categories, color, label, onDeleteRequest, projections = {}, flowSheetId, currency = 'USD' }: CategoryGroupProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const orderedCategories = localOrder
    ? (localOrder.map((id) => categories.find((c) => c.id === id)).filter(Boolean) as Category[])
    : categories;

  const handleDrop = useCallback(
    (toId: string, fireSortUpdate: (id: string, sortOrder: number) => void) => {
      if (!dragId || dragId === toId) {
        setDragId(null);
        setDragOverId(null);
        return;
      }
      const list = [...orderedCategories];
      const fromIdx = list.findIndex((c) => c.id === dragId);
      const toIdx = list.findIndex((c) => c.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = [...list];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      setLocalOrder(reordered.map((c) => c.id));
      setDragId(null);
      setDragOverId(null);

      reordered.forEach((cat, idx) => {
        if (cat.sortOrder !== idx) {
          fireSortUpdate(cat.id, idx);
        }
      });
    },
    [dragId, orderedCategories],
  );

  /**
   * Keyboard reorder: moves a category up or down by one position.
   * Fires sort-order mutations for the two swapped items.
   */
  const handleKeyboardReorder = useCallback(
    (catId: string, direction: 'up' | 'down', fireSortUpdate: (id: string, sortOrder: number) => void) => {
      const list = [...orderedCategories];
      const idx = list.findIndex((c) => c.id === catId);
      if (idx === -1) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;

      const reordered = [...list];
      // Swap the two items
      [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx]!, reordered[idx]!];

      setLocalOrder(reordered.map((c) => c.id));

      // Persist the two swapped items
      fireSortUpdate(reordered[idx]!.id, idx);
      fireSortUpdate(reordered[targetIdx]!.id, targetIdx);
    },
    [orderedCategories],
  );

  return (
    <section aria-label={`${label} categories`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span
          style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
          aria-hidden="true"
        />
        <h2
          style={{
            fontSize: 13, fontWeight: 600, letterSpacing: '0.5px',
            textTransform: 'uppercase', margin: 0, color,
          }}
        >
          {label}
        </h2>
        <span
          style={{ fontSize: 12, color: '#A8A29E', background: '#F5F5F4', borderRadius: 10, padding: '1px 7px' }}
          aria-label={`${orderedCategories.length} categories`}
        >
          {orderedCategories.length}
        </span>
      </div>

      {orderedCategories.length === 0 ? (
        <p style={{ fontSize: 13, color: '#A8A29E', margin: 0, paddingLeft: 16 }}>
          No {label.toLowerCase()} categories yet.
        </p>
      ) : (
        <ul
          role="list"
          aria-label={`${label} category list`}
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          {orderedCategories.map((cat, idx) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              color={color}
              isRenaming={renamingId === cat.id}
              renameValue={renameValue}
              isDragging={dragId === cat.id}
              isDragOver={dragOverId === cat.id}
              projection={projections[cat.id]}
              flowSheetId={flowSheetId}
              currency={currency}
              isFirst={idx === 0}
              isLast={idx === orderedCategories.length - 1}
              onStartRename={() => { setRenamingId(cat.id); setRenameValue(cat.name); }}
              onRenameChange={setRenameValue}
              onRenameCancel={() => setRenamingId(null)}
              onRenameCommitDone={() => setRenamingId(null)}
              onDelete={() => onDeleteRequest(cat)}
              onDragStart={() => setDragId(cat.id)}
              onDragOver={() => setDragOverId(cat.id)}
              onDrop={(fireSortUpdate) => handleDrop(cat.id, fireSortUpdate)}
              onKeyboardReorder={(direction, fireSortUpdate) => handleKeyboardReorder(cat.id, direction, fireSortUpdate)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── CategoryRow ───────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: Category;
  color: string;
  isRenaming: boolean;
  renameValue: string;
  isDragging: boolean;
  isDragOver: boolean;
  projection?: CategoryProjection;
  flowSheetId?: string;
  currency?: string;
  isFirst: boolean;
  isLast: boolean;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameCancel: () => void;
  onRenameCommitDone: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: (fireSortUpdate: (id: string, sortOrder: number) => void) => void;
  onKeyboardReorder: (direction: 'up' | 'down', fireSortUpdate: (id: string, sortOrder: number) => void) => void;
}

function CategoryRow({
  category,
  color,
  isRenaming,
  renameValue,
  isDragging,
  isDragOver,
  projection,
  flowSheetId,
  currency = 'USD',
  isFirst,
  isLast,
  onStartRename,
  onRenameChange,
  onRenameCancel,
  onRenameCommitDone,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onKeyboardReorder,
}: CategoryRowProps) {
  const updateMutation = useUpdateCategory(category.id);
  const upsertProjection = useUpsertProjection(flowSheetId ?? '');
  const deleteProjection = useDeleteProjection(flowSheetId ?? '');

  const [editingProjection, setEditingProjection] = useState(false);
  const [projectionValue, setProjectionValue] = useState('');
  const [projectionError, setProjectionError] = useState('');

  const startEditProjection = () => {
    setProjectionValue(projection ? String(projection.projectedAmount) : '');
    setProjectionError('');
    setEditingProjection(true);
  };

  const commitProjection = async () => {
    if (!flowSheetId) return;
    const parsed = parseFloat(projectionValue);
    if (!projectionValue.trim() || isNaN(parsed)) {
      if (projection) await deleteProjection.mutateAsync(category.id);
      setEditingProjection(false);
      return;
    }
    if (parsed <= 0) {
      setProjectionError('Projected amount must be greater than 0');
      return;
    }
    await upsertProjection.mutateAsync({
      categoryId: category.id,
      data: { projectedAmount: parsed, currency },
    });
    setEditingProjection(false);
    setProjectionError('');
  };

  const handleProjectionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitProjection();
    if (e.key === 'Escape') setEditingProjection(false);
  };

  const commitRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== category.name) {
      await updateMutation.mutateAsync({ name: trimmed });
    }
    onRenameCommitDone();
  }, [renameValue, category.name, updateMutation, onRenameCommitDone]);

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') onRenameCancel();
  };

  /** Keyboard handler for the drag handle — ArrowUp/ArrowDown reorder the row */
  const handleDragHandleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onKeyboardReorder('up', (id, sortOrder) => {
        if (id === category.id) updateMutation.mutate({ sortOrder });
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onKeyboardReorder('down', (id, sortOrder) => {
        if (id === category.id) updateMutation.mutate({ sortOrder });
      });
    }
  };

  return (
    <li
      role="listitem"
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(); }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop((id, sortOrder) => {
          if (id === category.id) updateMutation.mutate({ sortOrder });
        });
      }}
      onDragEnd={() => onDrop(() => {})}
      aria-label={`Category: ${category.name}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${isDragOver ? '#44403C' : '#E7E5E4'}`,
        background: isDragOver ? '#F5F5F4' : '#FFFFFF',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        transition: 'background 0.12s, border-color 0.12s, opacity 0.12s',
      }}
    >
      {/* Drag handle — also keyboard-operable via ArrowUp/ArrowDown */}
      <span
        role="button"
        tabIndex={0}
        aria-label={`Reorder ${category.name}. Use arrow keys to move up or down.`}
        aria-disabled={isFirst && isLast}
        title="Drag to reorder, or use arrow keys"
        onKeyDown={handleDragHandleKeyDown}
        style={{ fontSize: 14, color: '#D6D3D1', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
      >
        &#x2807;
      </span>

      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} aria-hidden="true" />

      {isRenaming ? (
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={commitRename}
          autoFocus
          aria-label={`Rename category ${category.name}`}
          maxLength={100}
          style={{
            flex: 1, fontSize: 14, color: '#1C1917',
            border: '1.5px solid #44403C', borderRadius: 6,
            padding: '3px 8px', outline: 'none', background: '#FAFAF9',
          }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 14, color: '#1C1917' }}>{category.name}</span>
      )}

      {category.isDefault && (
        <span
          aria-label="Default category"
          style={{ fontSize: 11, color: '#A8A29E', background: '#F5F5F4', borderRadius: 8, padding: '2px 7px', letterSpacing: '0.3px', flexShrink: 0 }}
        >
          default
        </span>
      )}

      {/* Projection input */}
      {flowSheetId && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {editingProjection ? (
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={projectionValue}
              onChange={(e) => { setProjectionValue(e.target.value); setProjectionError(''); }}
              onKeyDown={handleProjectionKeyDown}
              onBlur={commitProjection}
              autoFocus
              aria-label={`Set projected amount for ${category.name}`}
              aria-describedby={projectionError ? `proj-err-${category.id}` : undefined}
              aria-invalid={!!projectionError}
              style={{
                width: 90, fontSize: 13, color: '#1C1917',
                border: `1.5px solid ${projectionError ? '#C86D5A' : '#44403C'}`,
                borderRadius: 6, padding: '3px 8px', outline: 'none', background: '#FAFAF9',
              }}
            />
          ) : (
            <button
              type="button"
              onClick={startEditProjection}
              aria-label={projection ? `Edit projected amount for ${category.name}: ${projection.projectedAmount}` : `Set projected amount for ${category.name}`}
              style={{ ...BTN, fontSize: 12, color: projection ? color : '#A8A29E', borderColor: projection ? color : '#D6D3D1' }}
            >
              {projection
                ? `${new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(projection.projectedAmount)} projected`
                : 'Set projection'}
            </button>
          )}
          {projectionError && (
            <span id={`proj-err-${category.id}`} role="alert" style={{ fontSize: 11, color: '#C86D5A' }}>
              {projectionError}
            </span>
          )}
        </div>
      )}

      <div role="group" aria-label={`Actions for ${category.name}`} style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
        {!isRenaming && (
          <button type="button" onClick={onStartRename} aria-label={`Rename ${category.name}`} style={BTN}>
            Rename
          </button>
        )}
        {isRenaming && (
          <>
            <button
              type="button"
              onClick={commitRename}
              aria-label="Save rename"
              disabled={updateMutation.isPending}
              style={{ ...BTN, borderColor: '#44403C', color: '#1C1917' }}
            >
              {updateMutation.isPending ? 'Saving\u2026' : 'Save'}
            </button>
            <button type="button" onClick={onRenameCancel} aria-label="Cancel rename" style={BTN}>
              Cancel
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${category.name}`}
          style={{ ...BTN, color: '#C86D5A', borderColor: '#C86D5A' }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

const BTN: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6,
  border: '1.5px solid #D6D3D1', background: 'transparent',
  color: '#57534E', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
