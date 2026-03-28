'use client';

import { useMemo, useState, useCallback } from 'react';
import { Text } from '@tamagui/core';
import { YStack, XStack, TransactionRow } from '@lunero/ui';
import type { Entry } from '@lunero/core';
import { useActiveFlowSheet } from '../../../lib/hooks/use-flow-sheets';
import { useEntries, useDeleteEntry } from '../../../lib/hooks/use-entries';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProfile } from '../../../lib/hooks/use-profile';
import { useEntryStore } from '../../../lib/store/entry-store';
import { DeleteConfirmDialog } from '../../../components/dashboard/delete-confirm-dialog';

export default function TransactionsPage() {
  const { data: profile } = useProfile();
  const { data: flowSheet, isLoading: sheetLoading, error: sheetError } = useActiveFlowSheet();
  const { data: serverEntries = [], isLoading: entriesLoading } = useEntries(flowSheet?.id ?? '');
  const { data: categories = [] } = useCategories();

  const { entriesBySheet, removeEntry } = useEntryStore();

  // Merge server entries with any optimistic entries from the store
  const mergedEntries: Entry[] = useMemo(() => {
    if (!flowSheet) return serverEntries;
    const storeOnly = (entriesBySheet[flowSheet.id] ?? []).filter(
      (se) => se.id.startsWith('optimistic-') && !serverEntries.some((e) => e.id === se.id),
    );
    return [...serverEntries, ...storeOnly];
  }, [flowSheet, serverEntries, entriesBySheet]);

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';
  const deleteEntryMutation = useDeleteEntry(flowSheet?.id ?? '');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const sortedEntries = useMemo(
    () =>
      [...mergedEntries]
        .filter((e) => !e.isDeleted)
        .sort((a, b) => {
          const aDate = new Date(a.updatedAt ?? a.createdAt ?? a.entryDate).getTime();
          const bDate = new Date(b.updatedAt ?? b.createdAt ?? b.entryDate).getTime();
          return bDate - aDate;
        }),
    [mergedEntries],
  );

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId || !flowSheet) return;
    removeEntry(flowSheet.id, deleteTargetId);
    deleteEntryMutation.mutate(deleteTargetId);
    setDeleteTargetId(null);
  }, [deleteTargetId, flowSheet, removeEntry, deleteEntryMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  // Loading state
  if (sheetLoading || entriesLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="status"
        aria-label="Loading transactions"
      >
        <Text fontSize={14} color="$subtleText">Loading transactions…</Text>
      </YStack>
    );
  }

  // Error state
  if (sheetError) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="alert"
      >
        <Text fontSize={14} color="$expense">
          Could not load transactions. Please refresh the page.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={24} aria-label="All Transactions">
      {/* Header row */}
      <XStack alignItems="baseline" justifyContent="space-between">
        <Text fontSize={20} fontWeight="500" color="$color">
          All Transactions
        </Text>
        <Text fontSize={14} color="$placeholderColor">
          {sortedEntries.length} {sortedEntries.length === 1 ? 'transaction' : 'transactions'}
        </Text>
      </XStack>

      {/* Transaction list or empty state */}
      {sortedEntries.length === 0 ? (
        <YStack
          backgroundColor="$surface1"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={12}
          padding={28}
          alignItems="center"
        >
          <Text fontSize={14} color="$placeholderColor" textAlign="center">
            No transactions yet. Add entries to your FlowSheet to see them here.
          </Text>
        </YStack>
      ) : (
        <YStack
          gap={12}
          role="list"
          aria-label="Transaction list"
        >
          {sortedEntries.map((entry, idx) => (
            <TransactionRow
              key={entry.id}
              id={entry.id}
              note={entry.note || 'Untitled'}
              amount={entry.amount}
              currency={defaultCurrency}
              entryType={entry.entryType}
              categoryName={categoryMap.get(entry.categoryId) ?? 'Uncategorized'}
              entryDate={entry.entryDate}
              onDelete={handleDeleteRequest}
              index={idx}
            />
          ))}
        </YStack>
      )}

      {/* Delete confirmation dialog */}
      {deleteTargetId && (
        <DeleteConfirmDialog
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={deleteEntryMutation.isPending}
        />
      )}

      <style>{`
        .transaction-row:hover .transaction-delete-btn {
          opacity: 1 !important;
        }
        .transaction-delete-btn:focus-visible {
          opacity: 1 !important;
        }
      `}</style>
    </YStack>
  );
}
