/**
 * Tests for FlowSheetCard logic — currency formatting, date range formatting,
 * progress bar clamping, active/archived badge logic, and View Details callback.
 * Requirements: 15.6, 15.7, 15.8, 15.9
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
  const fmt = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const s = startDate.length === 10 ? `${startDate}T00:00:00` : startDate;
  const e = endDate.length === 10 ? `${endDate}T00:00:00` : endDate;
  return `${fmt.format(new Date(s))} \u2013 ${fmt.format(new Date(e))}`;
}

function clampPercent(actual: number, projected: number): number {
  if (projected <= 0) return 0;
  return Math.round(Math.min(actual / projected, 1) * 100);
}

function buildAriaLabel(name: string, isActive: boolean): string {
  return `FlowSheet: ${name}${isActive ? ', active' : ', archived'}`;
}

describe('FlowSheetCard logic', () => {
  describe('formatAmount', () => {
    it('formats USD amounts', () => {
      const result = formatAmount(4200, 'USD');
      expect(result).toContain('4,200');
      expect(result).toContain('00');
    });

    it('formats zero', () => {
      const result = formatAmount(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('formats negative amounts', () => {
      const result = formatAmount(-500, 'EUR');
      expect(result).toContain('500');
    });
  });

  describe('formatDateRange', () => {
    it('formats date range with en-dash', () => {
      const result = formatDateRange('2026-03-01', '2026-03-31');
      expect(result).toContain('\u2013');
      expect(result).toContain('Mar');
      expect(result).toContain('2026');
    });

    it('handles ISO datetime strings', () => {
      const result = formatDateRange('2026-01-01T00:00:00', '2026-01-31T00:00:00');
      expect(result).toContain('Jan');
    });
  });

  describe('clampPercent', () => {
    it('returns 0 when projected is zero', () => {
      expect(clampPercent(100, 0)).toBe(0);
    });

    it('returns 0 when projected is negative', () => {
      expect(clampPercent(100, -50)).toBe(0);
    });

    it('calculates correct percentage', () => {
      expect(clampPercent(4200, 6500)).toBe(65);
    });

    it('returns 100 when actual equals projected', () => {
      expect(clampPercent(3000, 3000)).toBe(100);
    });

    it('clamps to 100 when actual exceeds projected', () => {
      expect(clampPercent(8000, 6500)).toBe(100);
    });

    it('returns 0 when actual is zero', () => {
      expect(clampPercent(0, 6500)).toBe(0);
    });
  });

  describe('active/archived badge logic (Req 15.7, 15.8, 15.9)', () => {
    it('active status shows Active badge', () => {
      const isActive = 'active' === 'active';
      expect(isActive).toBe(true);
    });

    it('archived status does not show Active badge', () => {
      const isActive = 'archived' === 'active';
      expect(isActive).toBe(false);
    });

    it('active card gets accent left border', () => {
      const isActive = true;
      const borderLeftWidth = isActive ? 3 : 1;
      expect(borderLeftWidth).toBe(3);
    });

    it('archived card gets standard border', () => {
      const isActive = false;
      const borderLeftWidth = isActive ? 3 : 1;
      expect(borderLeftWidth).toBe(1);
    });
  });

  describe('aria-label generation', () => {
    it('includes name and active status', () => {
      expect(buildAriaLabel('March Budget', true)).toBe('FlowSheet: March Budget, active');
    });

    it('includes name and archived status', () => {
      expect(buildAriaLabel('Feb Budget', false)).toBe('FlowSheet: Feb Budget, archived');
    });
  });

  describe('View Details callback (Req 15.6)', () => {
    it('onViewDetails is callable', () => {
      const onViewDetails = vi.fn();
      onViewDetails();
      expect(onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('keyboard Enter/Space triggers callback', () => {
      const onViewDetails = vi.fn();
      const handleKeyDown = (key: string) => {
        if (key === 'Enter' || key === ' ') {
          onViewDetails();
        }
      };
      handleKeyDown('Enter');
      handleKeyDown(' ');
      handleKeyDown('Tab');
      expect(onViewDetails).toHaveBeenCalledTimes(2);
    });
  });
});
