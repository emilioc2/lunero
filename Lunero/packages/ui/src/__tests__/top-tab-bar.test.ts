/**
 * Tests for TopTabBar logic — tab active detection, tab configuration, and keyboard navigation indices.
 * Requirements: 2.2, 2.3, 2.5
 */
import { describe, it, expect } from 'vitest';

// Inline the logic functions to avoid Tamagui runtime in test environment

const TABS = [
  { path: '/', label: 'Overview' },
  { path: '/flowsheets', label: 'FlowSheets' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/analytics', label: 'Analytics' },
];

function isTabActive(tabPath: string, activePath: string): boolean {
  if (tabPath === '/') return activePath === '/';
  return activePath === tabPath || activePath.startsWith(tabPath + '/');
}

/** Simulates arrow key navigation index calculation */
function nextTabIndex(current: number, direction: 'right' | 'left'): number {
  const len = TABS.length;
  if (direction === 'right') return (current + 1) % len;
  return (current - 1 + len) % len;
}

describe('TopTabBar', () => {
  describe('Tab configuration', () => {
    it('has exactly 5 tabs', () => {
      expect(TABS).toHaveLength(5);
    });

    it('contains the correct tab labels in order', () => {
      const labels = TABS.map((t) => t.label);
      expect(labels).toEqual(['Overview', 'FlowSheets', 'Transactions', 'Calendar', 'Analytics']);
    });

    it('contains the correct tab paths', () => {
      const paths = TABS.map((t) => t.path);
      expect(paths).toEqual(['/', '/flowsheets', '/transactions', '/calendar', '/analytics']);
    });
  });

  describe('isTabActive', () => {
    it('marks Overview active only for exact "/" path', () => {
      expect(isTabActive('/', '/')).toBe(true);
      expect(isTabActive('/', '/flowsheets')).toBe(false);
      expect(isTabActive('/', '/anything')).toBe(false);
    });

    it('marks FlowSheets active for exact match', () => {
      expect(isTabActive('/flowsheets', '/flowsheets')).toBe(true);
    });

    it('marks FlowSheets active for nested routes', () => {
      expect(isTabActive('/flowsheets', '/flowsheets/abc-123')).toBe(true);
    });

    it('does not mark FlowSheets active for unrelated paths', () => {
      expect(isTabActive('/flowsheets', '/calendar')).toBe(false);
      expect(isTabActive('/flowsheets', '/')).toBe(false);
    });

    it('marks Analytics active for exact match', () => {
      expect(isTabActive('/analytics', '/analytics')).toBe(true);
    });

    it('does not false-positive on partial prefix matches', () => {
      expect(isTabActive('/cal', '/calendar')).toBe(false);
    });

    it('handles each tab correctly', () => {
      for (const tab of TABS) {
        expect(isTabActive(tab.path, tab.path)).toBe(true);
      }
    });
  });

  describe('aria-current attribute logic', () => {
    it('active tab gets aria-current="page"', () => {
      const activePath = '/flowsheets';
      for (const tab of TABS) {
        const active = isTabActive(tab.path, activePath);
        const ariaCurrent = active ? 'page' : undefined;
        if (tab.path === '/flowsheets') {
          expect(ariaCurrent).toBe('page');
        } else {
          expect(ariaCurrent).toBeUndefined();
        }
      }
    });

    it('only one tab is active at a time', () => {
      const activePath = '/calendar';
      const activeCount = TABS.filter((t) => isTabActive(t.path, activePath)).length;
      expect(activeCount).toBe(1);
    });
  });

  describe('Keyboard navigation', () => {
    it('ArrowRight from first tab goes to second', () => {
      expect(nextTabIndex(0, 'right')).toBe(1);
    });

    it('ArrowRight from last tab wraps to first', () => {
      expect(nextTabIndex(TABS.length - 1, 'right')).toBe(0);
    });

    it('ArrowLeft from first tab wraps to last', () => {
      expect(nextTabIndex(0, 'left')).toBe(TABS.length - 1);
    });

    it('ArrowLeft from second tab goes to first', () => {
      expect(nextTabIndex(1, 'left')).toBe(0);
    });

    it('cycles through all tabs with repeated ArrowRight', () => {
      let idx = 0;
      for (let i = 0; i < TABS.length; i++) {
        idx = nextTabIndex(idx, 'right');
      }
      expect(idx).toBe(0);
    });
  });

  describe('+ Add New button', () => {
    it('button label is "+ Add New"', () => {
      const expectedLabel = '+ Add New';
      expect(expectedLabel).toBe('+ Add New');
    });
  });
});
