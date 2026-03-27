import type { RecurringEntry, Entry } from './types';

/**
 * Filters recurring entries that should be auto-populated into a new FlowSheet period.
 * Excludes paused and deleted entries.
 * Cadence determines whether the entry falls within the given period range.
 */
export function getRecurringEntriesForPeriod(
  recurring: RecurringEntry[],
  period: { start: Date; end: Date }
): RecurringEntry[] {
  return recurring.filter((r) => {
    if (r.isPaused || r.isDeleted) return false;
    return cadenceFitsInPeriod(r.cadence, period);
  });
}

/**
 * Returns true if the cadence fires at least once within the given period range.
 */
function cadenceFitsInPeriod(
  cadence: RecurringEntry['cadence'],
  period: { start: Date; end: Date }
): boolean {
  const durationDays = Math.round(
    (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  switch (cadence) {
    case 'daily':
      return durationDays >= 1;
    case 'weekly':
      return durationDays >= 7;
    case 'bi-weekly':
      return durationDays >= 14;
    case 'monthly':
      return durationDays >= 28;
    default:
      return false;
  }
}

/**
 * Detects entries that appear with the same amount and category across 3+ consecutive periods.
 * Returns the categoryId+amount pairs that qualify as recurring suggestions.
 */
export function detectRecurringSuggestions(
  periodEntries: Entry[][]
): Array<{ categoryId: string; amount: number }> {
  if (periodEntries.length < 3) return [];

  // Count consecutive periods where the same (categoryId, amount) appears
  const keyCount = new Map<string, number>();

  for (const entries of periodEntries) {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (entry.isDeleted) continue;
      const key = `${entry.categoryId}:${entry.amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
      }
    }
  }

  const suggestions: Array<{ categoryId: string; amount: number }> = [];
  for (const [key, count] of keyCount.entries()) {
    if (count >= 3) {
      const [categoryId, amountStr] = key.split(':');
      suggestions.push({ categoryId: categoryId!, amount: parseFloat(amountStr!) });
    }
  }
  return suggestions;
}
