'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text } from '@tamagui/core';
import { YStack, XStack, FlowSheetCard } from '@lunero/ui';
import type { FlowSheet } from '@lunero/core';
import { useFlowSheets } from '../../../lib/hooks/use-flow-sheets';
import { useProfile } from '../../../lib/hooks/use-profile';
import { CreateFlowSheetModal } from '../../../components/dashboard/create-flow-sheet-modal';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useCreateFlowSheet } from '../../../lib/hooks/use-flow-sheets';
import { useUpsertProjection } from '../../../lib/hooks/use-projections';
import type { CreateFlowSheetDto } from '@lunero/api-client';
import type { ProjectionDraft } from '../../../components/dashboard/create-flow-sheet-modal';

export default function FlowSheetsPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: flowSheets = [], isLoading, error } = useFlowSheets();
  const { data: categories = [] } = useCategories();
  const defaultCurrency = profile?.defaultCurrency ?? 'USD';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const createMutation = useCreateFlowSheet();

  // Sort: active first, then archived by end date descending
  const sortedSheets = useMemo(() => {
    return [...flowSheets].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });
  }, [flowSheets]);

  const hasActiveSheet = sortedSheets.some((s) => s.status === 'active');

  const handleCreateSubmit = async (dto: CreateFlowSheetDto, projections: ProjectionDraft[]) => {
    await createMutation.mutateAsync(dto);
    setShowCreateModal(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="status"
        aria-label="Loading FlowSheets"
      >
        <Text fontSize={14} color="$subtleText">Loading FlowSheets…</Text>
      </YStack>
    );
  }

  // Error state
  if (error) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        role="alert"
      >
        <Text fontSize={14} color="$expense">
          Could not load FlowSheets. Please refresh the page.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={32} aria-label="FlowSheets">
      {/* Page header */}
      <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
        <YStack gap="$2" flex={1}>
          <Text fontSize={20} fontWeight="500" color="$color">
            FlowSheets
          </Text>
          <Text fontSize={14} color="$placeholderColor">
            Manage your budget periods and track projected vs actual spending.
          </Text>
        </YStack>
        {!hasActiveSheet && (
          <Text
            fontSize={14}
            fontWeight="500"
            color="#FFFFFF"
            backgroundColor="#C86D5A"
            paddingHorizontal={18}
            paddingVertical={8}
            borderRadius={8}
            cursor="pointer"
            role="button"
            tabIndex={0}
            onPress={() => setShowCreateModal(true)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowCreateModal(true);
              }
            }}
            hoverStyle={{ opacity: 0.9 }}
          >
            + New FlowSheet
          </Text>
        )}
      </XStack>

      {/* Empty state */}
      {sortedSheets.length === 0 && (
        <YStack
          backgroundColor="$surface1"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={12}
          padding={28}
          alignItems="center"
          gap="$3"
        >
          <Text fontSize={14} color="$placeholderColor" textAlign="center">
            No FlowSheets yet. Create your first budget period to get started.
          </Text>
        </YStack>
      )}

      {/* 2-column card grid */}
      {sortedSheets.length > 0 && (
        <XStack flexWrap="wrap" gap={20}>
          {sortedSheets.map((sheet) => (
            <YStack
              key={sheet.id}
              width="100%"
              $gtMd={{ width: 'calc(50% - 10px)' as any }}
            >
              <FlowSheetCard
                name={`${sheet.periodType.charAt(0).toUpperCase() + sheet.periodType.slice(1)} Budget`}
                status={sheet.status}
                periodType={sheet.periodType.charAt(0).toUpperCase() + sheet.periodType.slice(1)}
                startDate={sheet.startDate}
                endDate={sheet.endDate}
                incomeActual={sheet.totalIncome}
                incomeProjected={0}
                expenseActual={sheet.totalExpenses}
                expenseProjected={0}
                projectedBalance={sheet.availableBalance}
                currency={defaultCurrency}
                onViewDetails={() => router.push(`/flowsheets/${sheet.id}`)}
              />
            </YStack>
          ))}
        </XStack>
      )}

      {/* Create FlowSheet Modal */}
      {showCreateModal && (
        <CreateFlowSheetModal
          categories={categories}
          carriedProjections={[]}
          currency={defaultCurrency}
          isSubmitting={createMutation.isPending}
          onSubmit={handleCreateSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </YStack>
  );
}
