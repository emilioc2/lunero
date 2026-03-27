import { Text } from '@tamagui/core';
import type { EntryType } from '@lunero/core';
import { XStack } from './primitives';
import { COLOR } from './tokens';

export interface CategoryChipProps {
  name: string;
  entryType: EntryType;
}

/** Maps entry type to the Lunero brand color. */
export function getCategoryColor(entryType: EntryType): string {
  switch (entryType) {
    case 'income':
      return COLOR.incomeOliveGray;
    case 'expense':
      return COLOR.expenseClayRed;
    case 'savings':
      return COLOR.savingsWarmEarth;
  }
}

export function CategoryChip({ name, entryType }: CategoryChipProps) {
  const color = getCategoryColor(entryType);

  return (
    <XStack
      backgroundColor={`${color}22`} // ~13% opacity tint
      borderRadius="$full"
      paddingHorizontal="$2"
      paddingVertical="$1"
      alignItems="center"
      role="img"
      aria-label={`Category: ${name} (${entryType})`}
    >
      {/* Color dot */}
      <XStack
        width={6}
        height={6}
        borderRadius="$full"
        backgroundColor={color as any}
        marginRight="$1"
        aria-hidden="true"
      />
      <Text
        fontSize={12}
        fontWeight="500"
        color={color as any}
        lineHeight={16}
      >
        {name}
      </Text>
    </XStack>
  );
}
