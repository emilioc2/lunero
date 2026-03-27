/**
 * Locale-aware formatting utilities.
 *
 * All functions use `undefined` as the locale argument so the browser's
 * navigator.language is picked up automatically (Requirement 15.1–15.4).
 *
 * Dates are stored as UTC ISO strings; these helpers convert to local time
 * for display only (Requirement 15.3).
 */

// ── Date formatting ──────────────────────────────────────────────────────────

/**
 * Formats an ISO date string (YYYY-MM-DD or full ISO) in the device locale.
 * Appends T00:00:00 to avoid UTC-to-local day-shift on date-only strings.
 *
 * @example formatDate('2025-03-15') → "15 Mar 2025" (en-GB) or "Mar 15, 2025" (en-US)
 */
export function formatDate(isoDate: string): string {
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by the Date constructor,
  // which can shift the displayed day by -1 in negative-offset timezones (e.g. UTC-5).
  // Appending T00:00:00 (no Z) forces local-time parsing instead.
  const normalized = isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(normalized));
}

/**
 * Formats an ISO date string as a long, human-readable label for screen readers.
 *
 * @example formatDateLong('2025-03-15') → "Saturday, March 15, 2025"
 */
export function formatDateLong(isoDate: string): string {
  // Same UTC day-shift guard as formatDate — keeps the displayed date consistent
  // with the user's local calendar regardless of their timezone offset.
  const normalized = isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(normalized));
}

/**
 * Formats a date range (start–end) in the device locale.
 *
 * @example formatPeriodLabel('2025-03-01', '2025-03-31') → "01 Mar 2025 – 31 Mar 2025"
 */
export function formatPeriodLabel(startDate: string, endDate: string): string {
  // Reuse a single Intl.DateTimeFormat instance for both dates — avoids constructing
  // two separate formatters and keeps the locale/options consistent.
  const fmt = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  // Apply the UTC day-shift guard to both boundary dates.
  const s = startDate.length === 10 ? `${startDate}T00:00:00` : startDate;
  const e = endDate.length === 10 ? `${endDate}T00:00:00` : endDate;
  // \u2013 is an en-dash (–), the typographically correct separator for date ranges.
  return `${fmt.format(new Date(s))} \u2013 ${fmt.format(new Date(e))}`;
}

/**
 * Formats a month+year label for a calendar header in the device locale.
 * Day is set to 1 — only month and year are rendered, so the day value is irrelevant.
 *
 * @example formatMonthYear(2, 2025) → "March 2025"
 */
export function formatMonthYear(month: number, year: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

// ── Number / currency formatting ─────────────────────────────────────────────

/**
 * Formats a monetary amount in the device locale using the given currency code.
 * Always renders exactly 2 decimal places to match financial display conventions.
 *
 * @example formatCurrency(1234.5, 'EUR') → "€1,234.50" (en-US) or "1.234,50 €" (de-DE)
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a monetary amount with no decimal places (useful for compact projections).
 * Rounds to the nearest whole unit — suitable for summary/overview displays where
 * precision is less important than readability.
 */
export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a plain number in the device locale (no currency symbol).
 * `fractionDigits` controls both min and max decimal places so the output
 * always has a consistent width (e.g. "1.00" not "1").
 *
 * @example formatNumber(1234567.89) → "1,234,567.89" (en-US) or "1.234.567,89" (de-DE)
 */
export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

// ── Locale-aware sorting ─────────────────────────────────────────────────────

/**
 * Returns a locale-aware comparator for string fields.
 * Uses `Intl.Collator` with `sensitivity: 'base'` for accent-insensitive,
 * case-insensitive sorting (Requirement 15.4).
 *
 * @example
 *   categories.sort(localeCompare((c) => c.name))
 */
export function localeCompare<T>(
  selector: (item: T) => string,
  options?: Intl.CollatorOptions,
): (a: T, b: T) => number {
  // `sensitivity: 'base'` treats accented variants as equal to their base letter
  // (e.g. "é" === "e"), which is the expected behaviour for category name sorting.
  // `numeric: true` sorts "10" after "9" rather than after "1" (natural sort order).
  // Caller-supplied options are spread last so they can override these defaults.
  const collator = new Intl.Collator(undefined, {
    sensitivity: 'base',
    numeric: true,
    ...options,
  });
  return (a, b) => collator.compare(selector(a), selector(b));
}

/**
 * Sorts an array of items by a string field using locale-aware collation.
 * Returns a new array (does not mutate the original).
 */
export function sortByLocale<T>(
  items: T[],
  selector: (item: T) => string,
  options?: Intl.CollatorOptions,
): T[] {
  // Spread into a new array before sorting — Array.prototype.sort mutates in place.
  return [...items].sort(localeCompare(selector, options));
}
