import { Text } from '@tamagui/core';
import type { ProjectionSummary, EntryType } from '@lunero/core';
import { XStack, YStack } from './primitives';
import { ProjectionBar } from './projection-bar';

export interface ProjectionSummaryPanelProps {
  summary: ProjectionSummary;
  currency?: string;
}

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  income: 'Income',
  expense: 'Expenses',
  savings: 'Savings',
};

const ENTRY_TYPES: EntryType[] = ['income', 'expense', 'savings'];

export function ProjectionSummaryPanel({ summary, currency = 'USD' }: ProjectionSummaryPanelProps) {
  const { byEntryType, overall } = summary;

  return (
    <YStack
      gap="$5"
      backgroundColor="$surface1"
      borderRadius="$3"
      padding="$5"
      borderWidth={1}
      borderColor="$borderColor"
      role="region"
      aria-label="Budget projections summary"
    >
      <Text
        fontSize={13}
        color="$placeholderColor"
        textTransform="uppercase"
        letterSpacing={1.5}
        aria-hidden="true"
      >
        Projections
      </Text>

      {/* Entry-type level breakdown */}
      <YStack gap="$4" role="list" aria-label="Projections by type">
        {ENTRY_TYPES.map((type) => {
          const row = byEntryType[type];
          if (!row || row.projected === 0) return null;
          return (
            <YStack key={type} role="listitem">
              <ProjectionBar
                label={ENTRY_TYPE_LABELS[type]}
                entryType={type}
                projectedAmount={row.projected}
                actualAmount={row.actual}
                currency={currency}
                statusColor={row.statusColor}
              />
            </YStack>
          );
        })}
      </YStack>

      {/* Divider */}
      {overall.projected > 0 && (
        <XStack height={1} backgroundColor="$borderColor" aria-hidden="true" />
      )}

      {/* FlowSheet overall */}
      {overall.projected > 0 && (
        <ProjectionBar
          label="Overall"
          entryType="expense"
          projectedAmount={overall.projected}
          actualAmount={overall.actual}
          currency={currency}
          statusColor={overall.statusColor}
        />
      )}
    </YStack>
  );
}
