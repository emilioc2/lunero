import React from 'react';
import { YStack } from './primitives';
import { COLOR } from './tokens';

export interface MiraFABProps {
  /** Whether the Mira popup is currently open — hides the FAB when true */
  isPopupOpen: boolean;
  /** Called when the FAB is activated */
  onPress: () => void;
}

export function MiraFAB({ isPopupOpen, onPress }: MiraFABProps) {
  if (isPopupOpen) return null;

  return (
    <YStack
      width={56}
      height={56}
      borderRadius={28}
      backgroundColor={COLOR.stone700}
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      position="absolute"
      bottom={24}
      right={24}
      role="button"
      tabIndex={0}
      aria-label="Open Mira AI coach"
      onPress={onPress}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9998,
        overflow: 'hidden',
        position: 'fixed',
      }}
      hoverStyle={{ backgroundColor: COLOR.stone800 }}
    >
      <img
        src="/mira.png"
        alt="Mira AI coach"
        width={56}
        height={56}
        style={{ display: 'block', objectFit: 'cover' }}
      />
    </YStack>
  );
}
