/**
 * Layout primitives built on top of Tamagui's base Stack.
 * XStack = horizontal flex row, YStack = vertical flex column.
 */
import { Stack, styled } from '@tamagui/core';

export const XStack = styled(Stack, {
  flexDirection: 'row',
});

export const YStack = styled(Stack, {
  flexDirection: 'column',
});
