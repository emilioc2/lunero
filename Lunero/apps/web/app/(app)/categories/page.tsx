'use client';

import { useState } from 'react';
import type { Category, CategoryProjection } from '@lunero/core';
import { useCategories, useCreateCategory } from '../../../lib/hooks/use-categories';
import { useActiveFlowSheet } from '../../../lib/hooks/use-flow-sheets';
import { useProjections } from '../../../lib/hooks/use-projections';
import { useProfile } from '../../../lib/hooks/use-profile';
import { CreateCategoryForm } from '../../../components/categories/create-category-form';
import { ReassignOrDiscardDialog } from '../../../components/categories/reassign-or-discard-dialog';
import { CategoryGroup } from '../../../components/categories/category-group';
import { sortByLocale } from '../../../lib/locale-utils';

// Brand colors per entry type — Olive Gray / Clay Red / Warm Earth (product.md design tokens)
const TYPE_COLORS: Record<string, string> = {
  income: '#6B6F69',
  expense: '#C86D5A',
  savings: '#C4A484',
};

// Human-readable labels rendered in each CategoryGroup header
export const TYPE_LABELS: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  savings: 'Savings',
};

// Fixed display order matches the product's entry type hierarchy
export const ENTRY_TYPES = ['income', 'expense', 'savings'] as const;

// Discriminated union keeps modal state self-contained — the 'delete' variant
// carries the target category so the dialog doesn't need a separate state variable
type ModalState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'delete'; category: Category };

export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategories();
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const createCategory = useCreateCategory();
  const { data: flowSheet } = useActiveFlowSheet();
  const { data: profile } = useProfile();
  const { data: projections = [] } = useProjections(flowSheet?.id ?? '');

  // Build a categoryId → projection map so CategoryGroup rows can look up
  // spending/income projections in O(1) instead of scanning the array each time.
  const projectionsByCategory = projections.reduce<Record<string, CategoryProjection>>(
    (acc, p) => { acc[p.categoryId] = p; return acc; },
    {},
  );

  // Group categories by entry type (income / expense / savings).
  // Within each group: primary sort by user-defined sortOrder, secondary sort
  // by locale-aware name comparison as a tiebreaker for equal sortOrder values.
  const grouped = ENTRY_TYPES.reduce<Record<string, Category[]>>((acc, type) => {
    acc[type] = sortByLocale(
      categories.filter((c) => c.entryType === type).sort((a, b) => a.sortOrder - b.sortOrder),
      (c) => c.name,
    );
    return acc;
  }, {} as Record<string, Category[]>);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading categories" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontSize: 14, color: '#78716C' }}>
        <span>Loading categories…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontSize: 14, color: '#C86D5A' }}>
        <p>Could not load categories. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <main aria-label="Categories" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1C1917', margin: 0 }}>Categories</h1>
        <button
          type="button"
          onClick={() => setModal({ type: 'create' })}
          aria-label="Create new category"
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#44403C', color: '#FAFAF9', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          + New Category
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {ENTRY_TYPES.map((type) => (
          <CategoryGroup
            key={type}
            type={type}
            categories={grouped[type]}
            color={TYPE_COLORS[type]}
            label={TYPE_LABELS[type]}
            onDeleteRequest={(cat) => setModal({ type: 'delete', category: cat })}
            projections={projectionsByCategory}
            flowSheetId={flowSheet?.id}
            currency={profile?.defaultCurrency ?? 'USD'}
          />
        ))}
      </div>

      {modal.type === 'create' && (
        <CreateCategoryForm
          onSubmit={async (data) => {
            await createCategory.mutateAsync(data);
            setModal({ type: 'closed' });
          }}
          onClose={() => setModal({ type: 'closed' })}
          isSubmitting={createCategory.isPending}
        />
      )}

      {modal.type === 'delete' && (
        <ReassignOrDiscardDialog
          category={modal.category}
          categories={categories}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}
    </main>
  );
}
