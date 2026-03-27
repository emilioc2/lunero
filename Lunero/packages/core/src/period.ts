import type { FlowSheet } from './types';

/**
 * Returns true if the given date falls within the FlowSheet's [startDate, endDate] range (inclusive).
 */
export function isWithinPeriod(date: Date, sheet: FlowSheet): boolean {
  const d = date.getTime();
  const start = new Date(sheet.startDate).getTime();
  const end = new Date(sheet.endDate).getTime();
  return d >= start && d <= end;
}

/**
 * Computes the next period's start/end dates based on the FlowSheet's period type.
 * For 'custom', advances by the same number of days as the current period.
 */
export function getNextPeriodRange(sheet: FlowSheet): { start: Date; end: Date } {
  const start = new Date(sheet.startDate);
  const end = new Date(sheet.endDate);

  if (sheet.periodType === 'weekly') {
    const nextStart = new Date(end);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 6);
    return { start: nextStart, end: nextEnd };
  }

  if (sheet.periodType === 'monthly') {
    const nextStart = new Date(end);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    nextEnd.setDate(nextEnd.getDate() - 1);
    return { start: nextStart, end: nextEnd };
  }

  // custom: repeat same duration
  const durationMs = end.getTime() - start.getTime();
  const nextStart = new Date(end);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(nextStart.getTime() + durationMs);
  return { start: nextStart, end: nextEnd };
}

/**
 * Returns true if the FlowSheet's end date is before the given `now` date,
 * meaning it should be auto-archived.
 */
export function shouldAutoArchive(sheet: FlowSheet, now: Date): boolean {
  if (sheet.status !== 'active') return false;
  const end = new Date(sheet.endDate);
  return end < now;
}
