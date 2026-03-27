import { Text } from '@tamagui/core';
import type { EntryType } from '@lunero/core';
import { XStack, YStack } from './primitives';
import { getCategoryColor } from './category-chip';
import { COLOR } from './tokens';

export interface ProjectionBarProps {
  /** Projected amount for the category/type */
  projectedAmount: number;
  /** Actual amount spent/earned so far */
  actualAmount: number;
  /** Entry type — used to derive the "under" color */
  entryType: EntryType;
  /** Label shown above the bar (e.g. category name or entry type) */
  label: string;
  /** Currency for formatting */
  currency?: string;
  /** Override status color (from backend's statusColor field) */
  statusColor?: string;
}

/** Formats a number as a locale-aware currency string, e.g. "$1,234.56". */
function formatAmount(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Derives the bar fill color based on actual vs projected spend.
 *
 * Priority order:
 *   1. Use `overrideColor` when the backend supplies a pre-computed statusColor.
 *   2. Fall back to the entry-type brand color when no projection exists (projectedAmount ≤ 0)
 *      or when the user is still under budget.
 *   3. Use warmNeutral when exactly at budget (100% utilisation).
 *   4. Use expenseClayRed when over budget — signals overspend without being alarming.
 */
export function getProjectionStatusColor(
  actualAmount: number,
  projectedAmount: number,
  entryType: EntryType,
  overrideColor?: string,
): string {
  if (overrideColor) return overrideColor;
  // No projection set — render in the neutral brand color for the entry type
  if (projectedAmount <= 0) return getCategoryColor(entryType);
  if (actualAmount < projectedAmount) return getCategoryColor(entryType);
  if (actualAmount === projectedAmount) return COLOR.warmNeutral;
  return COLOR.expenseClayRed; // over budget
}

export function ProjectionBar({
  projectedAmount,
  actualAmount,
  entryType,
  label,
  currency = 'USD',
  statusColor,
}: ProjectionBarProps) {
  const fillColor = getProjectionStatusColor(actualAmount, projectedAmount, entryType, statusColor);

  // Clamp fill to [0, 1] so the bar never overflows its track.
  // Overspend is communicated via color change, not by overflowing the bar.
  const fillRatio = projectedAmount > 0 ? Math.min(actualAmount / projectedAmount, 1) : 0;
  // Convert to an integer percentage for the aria-valuenow attribute and CSS width
  const fillPercent = Math.round(fillRatio * 100);

  // Derive human-readable status for the accessible label
  const isOver = actualAmount > projectedAmount && projectedAmount > 0;
  const isAt = actualAmount === projectedAmount && projectedAmount > 0;

  const statusLabel = isOver ? 'over budget' : isAt ? 'at budget' : 'under budget';
  // Full accessible description read by screen readers; the visual elements below are aria-hidden
  const ariaLabel = `${label}: ${formatAmount(actualAmount, currency)} of ${formatAmount(projectedAmount, currency)} projected — ${statusLabel}`;

  return (
    // role="meter" + aria-valuenow/min/max exposes this as a progress meter to assistive tech
    <YStack
      gap="$2"
      aria-label={ariaLabel}
      role="meter"
      aria-valuenow={fillPercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Label row: category/type name on the left, actual / projected amounts on the right */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} color="$color" fontWeight="500">
          {label}
        </Text>
        <XStack gap="$1" alignItems="center">
          {/* Actual amount inherits the status color so overspend is immediately visible */}
          <Text fontSize={12} color={fillColor as any} fontWeight="500" aria-hidden="true">
            {formatAmount(actualAmount, currency)}
          </Text>
          <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
            {' / '}
          </Text>
          <Text fontSize={12} color="$placeholderColor" aria-hidden="true">
            {formatAmount(projectedAmount, currency)}
          </Text>
        </XStack>
      </XStack>

      {/* Progress track: fixed-height pill that clips the fill bar at 100% */}
      <XStack
        height={6}
        borderRadius="$full"
        backgroundColor="$surface3"
        overflow="hidden"
        aria-hidden="true"
      >
        {/* Fill bar: width is a percentage string so Tamagui resolves it correctly on both web and native */}
        <XStack
          height="100%"
          borderRadius="$full"
          backgroundColor={fillColor as any}
          width={`${fillPercent}%` as any}
        />
      </XStack>
    </YStack>
  );
}
