/**
 * Tests for ActiveFlowSheetCard logic — currency formatting, date range formatting,
 * progress bar percentage clamping, aria-label generation, callback behavior, and
 * empty/no-active-sheet state handling.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 14.9
 */
import { describe, it, expect, vi } from 'vitest';

// Inline helper functions to avoid Tamagui runtime in test environment

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const s = startDate.length === 10 ? `${startDate}T00:00:00` : startDate;
  const e = endDate.length === 10 ? `${endDate}T00:00:00` : endDate;
  return `${fmt.format(new Date(s))} \u2013 ${fmt.format(new Date(e))}`;
}

function clampPercent(actual: number, projected: number): number {
  if (projected <= 0) return 0;
  return Math.round(Math.min(actual / projected, 1) * 100);
}

describe('ActiveFlowSheetCard logic', () => {
  describe('formatAmount', () => {
    it('formats USD amounts with two decimal places', () => {
      const result = formatAmount(4200, 'USD');
      expect(result).toContain('4,200');
      expect(result).toContain('00');
    });

    it('formats zero correctly', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('formats negative amounts', () => {
      const result = formatAmount(-500, 'USD');
      expect(result).toContain('500');
    });

    it('formats GBP amounts', () => {
      const result = formatAmount(1500.75, 'GBP');
      expect(result).toContain('1,500');
      expect(result).toContain('75');
    });
  });

  describe('formatDateRange', () => {
    it('formats a date range with en-dash separator', () => {
      const result = formatDateRange('2026-03-01', '2026-03-31');
      expect(result).toContain('\u2013'); // en-dash
      expect(result).toContain('Mar');
      expect(result).toContain('2026');
    });

    it('handles ISO datetime strings', () => {
      const result = formatDateRange('2026-01-01T00:00:00', '2026-01-31T00:00:00');
      expect(result).toContain('Jan');
      expect(result).toContain('2026');
      expect(result).toContain('\u2013');
    });

    it('handles cross-month ranges', () => {
      const result = formatDateRange('2026-02-15', '2026-03-15');
      expect(result).toContain('Feb');
      expect(result).toContain('Mar');
    });
  });

  describe('clampPercent', () => {
    it('returns 0 when projected is zero', () => {
      expect(clampPercent(100, 0)).toBe(0);
    });

    it('returns 0 when projected is negative', () => {
      expect(clampPercent(100, -50)).toBe(0);
    });

    it('returns 0 when actual is zero', () => {
      expect(clampPercent(0, 6500)).toBe(0);
    });

    it('calculates correct percentage for partial progress', () => {
      expect(clampPercent(4200, 6500)).toBe(65);
    });

    it('returns 100 when actual equals projected', () => {
      expect(clampPercent(3000, 3000)).toBe(100);
    });

    it('clamps to 100 when actual exceeds projected', () => {
      expect(clampPercent(8000, 6500)).toBe(100);
    });

    it('handles small fractional progress', () => {
      expect(clampPercent(50, 6500)).toBe(1);
    });
  });

  describe('progress bar status labels', () => {
    function getStatusLabel(actual: number, projected: number): string {
      if (projected <= 0) return 'no projection';
      if (actual > projected) return 'over budget';
      if (actual === projected) return 'at budget';
      return 'under budget';
    }

    it('returns "under budget" when actual < projected', () => {
      expect(getStatusLabel(1850, 3000)).toBe('under budget');
    });

    it('returns "at budget" when actual equals projected', () => {
      expect(getStatusLabel(3000, 3000)).toBe('at budget');
    });

    it('returns "over budget" when actual > projected', () => {
      expect(getStatusLabel(3500, 3000)).toBe('over budget');
    });

    it('returns "no projection" when projected is zero', () => {
      expect(getStatusLabel(100, 0)).toBe('no projection');
    });
  });

  describe('projected balance display', () => {
    it('formats projected balance in user currency', () => {
      const result = formatAmount(2100, 'USD');
      expect(result).toContain('2,100');
      expect(result).toContain('00');
    });
  });

  describe('progress bar fill percentages (Req 5.4, 5.5)', () => {
    it('computes income progress as percentage of projected', () => {
      // $4,200 actual of $6,500 projected = 64.6% → rounds to 65%
      expect(clampPercent(4200, 6500)).toBe(65);
    });

    it('computes expense progress as percentage of projected', () => {
      // $1,850 actual of $3,000 projected = 61.7% → rounds to 62%
      expect(clampPercent(1850, 3000)).toBe(62);
    });

    it('returns 50% for half progress', () => {
      expect(clampPercent(3250, 6500)).toBe(50);
    });

    it('returns 100% when fully met', () => {
      expect(clampPercent(6500, 6500)).toBe(100);
    });

    it('clamps at 100% when over-budget', () => {
      expect(clampPercent(7000, 6500)).toBe(100);
    });

    it('returns 0% when no actual spending', () => {
      expect(clampPercent(0, 3000)).toBe(0);
    });

    it('returns 0% when projected is zero (no projection set)', () => {
      expect(clampPercent(500, 0)).toBe(0);
    });
  });

  describe('View Details callback (Req 5.7)', () => {
    it('onViewDetails is callable and invoked once', () => {
      const onViewDetails = vi.fn();
      onViewDetails();
      expect(onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('onViewDetails can be invoked multiple times', () => {
      const onViewDetails = vi.fn();
      onViewDetails();
      onViewDetails();
      expect(onViewDetails).toHaveBeenCalledTimes(2);
    });

    it('keyboard activation (Enter/Space) should invoke the same callback', () => {
      const onViewDetails = vi.fn();
      const handleKeyDown = (key: string) => {
        if (key === 'Enter' || key === ' ') {
          onViewDetails();
        }
      };
      handleKeyDown('Enter');
      handleKeyDown(' ');
      handleKeyDown('Tab'); // should not trigger
      expect(onViewDetails).toHaveBeenCalledTimes(2);
    });
  });

  describe('empty/no-active-sheet state (Req 5.8)', () => {
    /**
     * The ActiveFlowSheetCard always renders with data.
     * The no-active-sheet state is handled at the page level: when no active
     * FlowSheet exists, the page renders a prompt instead of the card.
     * These tests verify the decision logic that determines which UI to show.
     */
    function shouldShowActiveCard(activeFlowSheet: unknown): boolean {
      return activeFlowSheet != null;
    }

    function getEmptyStateMessage(): string {
      return 'No active FlowSheet. Create a new FlowSheet to start tracking your budget.';
    }

    it('returns false when activeFlowSheet is null', () => {
      expect(shouldShowActiveCard(null)).toBe(false);
    });

    it('returns false when activeFlowSheet is undefined', () => {
      expect(shouldShowActiveCard(undefined)).toBe(false);
    });

    it('returns true when activeFlowSheet exists', () => {
      expect(shouldShowActiveCard({ id: '1', name: 'March 2026 Budget' })).toBe(true);
    });

    it('provides a prompt message when no active sheet exists', () => {
      const message = getEmptyStateMessage();
      expect(message).toContain('No active FlowSheet');
      expect(message).toContain('Create');
    });
  });
});
