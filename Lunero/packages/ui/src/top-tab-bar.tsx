import React, { useRef, useCallback } from 'react';
import { Text } from '@tamagui/core';
import { XStack, YStack } from './primitives';
import { COLOR } from './tokens';

export interface TabItem {
  path: string;
  label: string;
}

export interface TopTabBarProps {
  /** Currently active route path */
  activePath: string;
  /** Called when a tab is activated */
  onNavigate: (path: string) => void;
  /** Called when "+ Add New" is activated */
  onAddNew: () => void;
}

const TABS: TabItem[] = [
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

export function TopTabBar({ activePath, onNavigate, onAddNew }: TopTabBarProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (index + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (index - 1 + TABS.length) % TABS.length;
      }
      if (nextIndex >= 0) {
        tabsRef.current[nextIndex]?.focus();
      }
    },
    [],
  );

  return (
    <YStack>
      {/* Header area */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={24}
        paddingVertical={12}
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <img
          src="/logo.png"
          alt="Lunero"
          height={160}
          style={{ display: 'block' }}
        />
        <Text
          fontSize={13}
          color="$placeholderColor"
          cursor="pointer"
          role="link"
          accessibilityLabel="Help"
          hoverStyle={{ color: '$color' }}
        >
          Help
        </Text>
      </XStack>

      {/* Tab bar */}
      <XStack
        alignItems="center"
        paddingHorizontal={24}
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        gap="$3"
      >
        <XStack
          alignItems="center"
          gap="$1"
          flex={1}
          overflow="hidden"
          style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } as React.CSSProperties}
        >
          <XStack
            role="tablist"
            aria-label="Main navigation"
            alignItems="center"
            gap="$1"
          >
            {TABS.map((tab, index) => {
              const active = isTabActive(tab.path, activePath);
              return (
                <XStack
                  key={tab.path}
                  tag="button"
                  ref={(el: HTMLButtonElement | null) => { tabsRef.current[index] = el; }}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? 'page' : undefined}
                  tabIndex={active ? 0 : -1}
                  onPress={() => onNavigate(tab.path)}
                  onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, index)}
                  paddingHorizontal={12}
                  paddingVertical={10}
                  cursor="pointer"
                  borderWidth={0}
                  backgroundColor="transparent"
                  borderBottomWidth={3}
                  borderBottomColor={active ? COLOR.expenseClayRed : 'transparent'}
                  hoverStyle={{ backgroundColor: '$backgroundHover' }}
                >
                  <Text
                    fontSize={14}
                    fontWeight={active ? '500' : '400'}
                    color={active ? '$color' : '$placeholderColor'}
                    style={{ whiteSpace: 'nowrap' } as React.CSSProperties}
                  >
                    {tab.label}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </XStack>

        {/* + Add New button — outside scrollable area so it's always visible */}
        <XStack
          tag="button"
          role="button"
          aria-label="Add new entry"
          onPress={onAddNew}
          backgroundColor={COLOR.expenseClayRed}
          paddingHorizontal={14}
          paddingVertical={8}
          borderRadius={8}
          cursor="pointer"
          borderWidth={0}
          hoverStyle={{ opacity: 0.9 }}
          alignItems="center"
          gap="$1"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' } as React.CSSProperties}
        >
          <Text fontSize={14} fontWeight="500" color={COLOR.white}>
            + Add New
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}

// Export TABS and isTabActive for testing
export { TABS, isTabActive };
