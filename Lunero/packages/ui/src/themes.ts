import { createTheme } from '@tamagui/core';
import { COLOR } from './tokens';

// Light theme — warm neutral base
export const lightTheme = createTheme({
  background: COLOR.stone50,
  backgroundHover: COLOR.stone100,
  backgroundPress: COLOR.stone200,
  backgroundFocus: COLOR.stone100,

  borderColor: COLOR.stone200,
  borderColorHover: COLOR.stone300,

  color: COLOR.stone900,
  colorHover: COLOR.stone800,
  colorPress: COLOR.stone700,
  colorFocus: COLOR.stone900,

  placeholderColor: COLOR.stone400,

  // Surface layers
  surface1: COLOR.white,
  surface2: COLOR.stone100,
  surface3: COLOR.stone200,

  // Semantic
  income: COLOR.incomeOliveGray,
  expense: COLOR.expenseClayRed,
  savings: COLOR.savingsWarmEarth,
  warmNeutral: COLOR.warmNeutral,

  // Input
  inputBackground: COLOR.white,
  inputBorder: COLOR.stone300,
  inputBorderFocus: COLOR.stone500,
});

// Dark theme — deep warm neutrals
export const darkTheme = createTheme({
  background: COLOR.stone900,
  backgroundHover: COLOR.stone800,
  backgroundPress: COLOR.stone700,
  backgroundFocus: COLOR.stone800,

  borderColor: COLOR.stone700,
  borderColorHover: COLOR.stone600,

  color: COLOR.stone50,
  colorHover: COLOR.stone100,
  colorPress: COLOR.stone200,
  colorFocus: COLOR.stone50,

  placeholderColor: COLOR.stone500,

  // Surface layers
  surface1: COLOR.stone800,
  surface2: COLOR.stone700,
  surface3: COLOR.stone600,

  // Semantic
  income: COLOR.incomeOliveGray,
  expense: COLOR.expenseClayRed,
  savings: COLOR.savingsWarmEarth,
  warmNeutral: COLOR.warmNeutral,

  // Input
  inputBackground: COLOR.stone800,
  inputBorder: COLOR.stone600,
  inputBorderFocus: COLOR.stone400,
});

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;
