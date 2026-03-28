'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Text } from '@tamagui/core';
import { YStack, XStack, SummaryCard, CategoryCard } from '@lunero/ui';
import { useFlowSheet, useUnlockFlowSheet } from '../../../../lib/hooks/use-flow-sheets';
import { useEntries } from '../../../../lib/hooks/use-entries';
import { useCategories } from '../../../../lib/hooks/use-categories';
import { useProfile } from '../../../../lib/hooks/use-profile';
import { useProjectionSummary } from '../../../../lib/hooks/use-projections';
import { formatPeriodLabel, formatCurrency } from '../../../../lib/locale-utils';

/** Discriminated union for modal state. */
type ModalState = { type: 'closed' } | { type: 'unlock-confirm' };

export default function FlowSheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const { data: flowSheet, isLoading: sheetLoading, error: sheetError } = useFlowSheet(id);
  const { isLoading: entriesLoading } = useEntries(id);
  useCategories();
  const { data: profile } = useProfile();
  const { data: projectionSummary } = useProjectionSummary(id);

  const unlockSheet = useUnlockFlowSheet(id);

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';
  const isArchived = flowSheet?.status === 'archived';
  const isUnlocked = flowSheet ? !flowSheet.editLocked : false;

  // ── Derived data ───────────────────────────────────────────────────────

  interface CategorySummaryRow {
    categoryId: string;
    categoryName: string;
    entryType: string;
    projectedAmount: number;
    actualAmount: number;
    statusColor: string;
    [key: string]: unknown;
  }

  const { incomeCategories, expenseCategories } = useMemo(() => {
    const byCategory: CategorySummaryRow[] = projectionSummary?.byCategory ?? [];
    return {
      incomeCategories: byCategory.filter((c) => c.entryType === 'income'),
      expenseCategories: byCategory.filter((c) => c.entryType === 'expense'),
    };
  }, [projectionSummary]);

  const projectedIncome = projectionSummary?.byEntryType?.income?.projected ?? 0;
  const projectedExpenses = projectionSummary?.byEntryType?.expense?.projected ?? 0;
  const projectedNet = projectedIncome - projectedExpenses;

  const totalIncome = flowSheet?.totalIncome ?? 0;
  const totalExpenses = flowSheet?.totalExpenses ?? 0;
  const netBalance = totalIncome - totalExpenses;

  // ── Unlock flow ────────────────────────────────────────────────────────

  const handleUnlockConfirm = useCallback(async () => {
    setUnlockError(null);
    try {
      await unlockSheet.mutateAsync();
      setModal({ type: 'closed' });
    } catch {
      setUnlockError('Could not unlock this FlowSheet. Please try again.');
    }
  }, [unlockSheet]);

  // ── Loading state ──────────────────────────────────────────────────────

  if (sheetLoading || entriesLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="status"
        aria-label="Loading FlowSheet"
      >
        <Text fontSize={14} color="$placeholderColor">Loading FlowSheet…</Text>
      </YStack>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (sheetError || !flowSheet) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        gap={16}
        role="alert"
      >
        <Text fontSize={14} color="$expense">
          Could not load this FlowSheet.
        </Text>
        <Text
          fontSize={13}
          color="$placeholderColor"
          cursor="pointer"
          onPress={() => router.push('/flowsheets')}
          role="link"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/flowsheets');
          }}
        >
          ← Back to FlowSheets
        </Text>
      </YStack>
    );
  }

  const periodLabel = formatPeriodLabel(flowSheet.startDate, flowSheet.endDate);
  const sheetName = `${flowSheet.periodType.charAt(0).toUpperCase() + flowSheet.periodType.slice(1)} Budget`;

  return (
    <YStack gap={32} maxWidth={720} aria-label={`FlowSheet: ${sheetName}`}>
      {/* ── Header: back arrow + title + badge ── */}
      <YStack gap={8}>
        <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={16}>
          <XStack alignItems="center" gap={8} flex={1}>
            <Text
              fontSize={20}
              fontWeight="500"
              color="$color"
              cursor="pointer"
              role="link"
              tabIndex={0}
              onPress={() => router.push('/flowsheets')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') router.push('/flowsheets');
              }}
              aria-label="Back to FlowSheets"
            >
              ←
            </Text>
            <Text fontSize={20} fontWeight="500" color="$color">
              {sheetName}
            </Text>
          </XStack>

          {isArchived ? (
            <XStack
              backgroundColor="#F5F5F4"
              paddingHorizontal={10}
              paddingVertical={3}
              borderRadius={99}
              alignItems="center"
            >
              <Text fontSize={11} fontWeight="500" color="#78716C" textTransform="uppercase" letterSpacing={0.5}>
                Archived
              </Text>
            </XStack>
          ) : (
            <XStack
              backgroundColor="#C86D5A"
              paddingHorizontal={10}
              paddingVertical={3}
              borderRadius={99}
              alignItems="center"
            >
              <Text fontSize={11} fontWeight="500" color="#FFFFFF" textTransform="uppercase" letterSpacing={0.5}>
                Active Period
              </Text>
            </XStack>
          )}
        </XStack>

        <Text fontSize={13} color="$placeholderColor">{periodLabel}</Text>

        {isArchived && !isUnlocked && (
          <XStack>
            <Text
              fontSize={14}
              fontWeight="500"
              color="$color"
              paddingHorizontal={18}
              paddingVertical={8}
              borderRadius={8}
              borderWidth={1}
              borderColor="#D6D3D1"
              cursor="pointer"
              role="button"
              tabIndex={0}
              aria-label="Unlock this FlowSheet for editing"
              onPress={() => setModal({ type: 'unlock-confirm' })}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setModal({ type: 'unlock-confirm' });
                }
              }}
              hoverStyle={{ backgroundColor: '#F5F5F4' as any }}
            >
              Unlock to Edit
            </Text>
          </XStack>
        )}
      </YStack>

      {/* ── Detail Summary Cards ── */}
      <XStack flexWrap="wrap" gap={16} flexDirection="column" $gtMd={{ flexDirection: 'row' }}>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 200 }}>
          <SummaryCard
            label="Income"
            amount={totalIncome}
            currency={defaultCurrency}
            subtitle={`Projected: ${formatCurrency(projectedIncome, defaultCurrency)}`}
            icon="↑"
          />
        </YStack>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 200 }}>
          <SummaryCard
            label="Expenses"
            amount={totalExpenses}
            currency={defaultCurrency}
            subtitle={`Projected: ${formatCurrency(projectedExpenses, defaultCurrency)}`}
            icon="↓"
          />
        </YStack>
        <YStack flex={1} minWidth={0} $gtMd={{ minWidth: 200 }}>
          <SummaryCard
            label="Savings"
            amount={netBalance}
            currency={defaultCurrency}
            subtitle={`Projected: ${formatCurrency(projectedNet, defaultCurrency)}`}
            icon="◎"
          />
        </YStack>
      </XStack>

      {/* ── Income Sources ── */}
      {incomeCategories.length > 0 && (
        <YStack gap={16}>
          <Text fontSize={15} fontWeight="500" color="$color">
            Income Sources
          </Text>
          <XStack flexWrap="wrap" gap={16}>
            {incomeCategories.map((cat) => (
              <YStack
                key={cat.categoryId}
                width="100%"
                $gtMd={{ width: 'calc(50% - 8px)' as any }}
              >
                <CategoryCard
                  name={cat.categoryName}
                  type="income"
                  projectedAmount={cat.projectedAmount}
                  actualAmount={cat.actualAmount}
                  currency={defaultCurrency}
                  isEditable={isUnlocked || !isArchived}
                />
              </YStack>
            ))}
          </XStack>
        </YStack>
      )}

      {/* ── Expense Categories ── */}
      {expenseCategories.length > 0 && (
        <YStack gap={16}>
          <Text fontSize={15} fontWeight="500" color="$color">
            Expense Categories
          </Text>
          <XStack flexWrap="wrap" gap={16}>
            {expenseCategories.map((cat) => (
              <YStack
                key={cat.categoryId}
                width="100%"
                $gtMd={{ width: 'calc(50% - 8px)' as any }}
              >
                <CategoryCard
                  name={cat.categoryName}
                  type="expense"
                  projectedAmount={cat.projectedAmount}
                  actualAmount={cat.actualAmount}
                  currency={defaultCurrency}
                  isEditable={isUnlocked || !isArchived}
                />
              </YStack>
            ))}
          </XStack>
        </YStack>
      )}

      {/* ── Unlock Confirm Dialog ── */}
      {modal.type === 'unlock-confirm' && (
        <UnlockConfirmDialog
          periodLabel={periodLabel}
          isUnlocking={unlockSheet.isPending}
          error={unlockError}
          onConfirm={handleUnlockConfirm}
          onCancel={() => { setModal({ type: 'closed' }); setUnlockError(null); }}
        />
      )}
    </YStack>
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
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: 'var(--surface1, #FAFAF9)', borderRadius: 12, padding: '28px 24px',
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color, #1C1917)', margin: '0 0 12px' }}>
          Unlock FlowSheet?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--placeholderColor, #78716C)', lineHeight: 1.6, margin: '0 0 20px' }}>
          This will allow you to edit entries in <strong>{periodLabel}</strong>.
          The sheet will re-lock automatically after you save.
        </p>

        {error && <p role="alert" style={{ fontSize: 13, color: '#C86D5A', margin: '0 0 16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isUnlocking}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', border: '1px solid var(--borderColorHover, #D6D3D1)', background: 'transparent',
              color: 'var(--color, #44403C)', opacity: isUnlocking ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUnlocking}
            aria-busy={isUnlocking}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', border: '1px solid var(--color, #44403C)', background: 'var(--color, #44403C)',
              color: 'var(--background, #FAFAF9)', opacity: isUnlocking ? 0.6 : 1,
            }}
          >
            {isUnlocking ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}
