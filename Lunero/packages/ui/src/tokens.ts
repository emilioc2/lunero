import { createTokens } from '@tamagui/core';

// Lunero brand palette
export const COLOR = {
  // Warm neutrals
  stone50: '#FAFAF9',
  stone100: '#F5F5F4',
  stone200: '#E7E5E4',
  stone300: '#D6D3D1',
  stone400: '#A8A29E',
  stone500: '#78716C',
  stone600: '#57534E',
  stone700: '#44403C',
  stone800: '#292524',
  stone900: '#1C1917',

  // Category colors
  incomeOliveGray: '#6B6F69',
  expenseClayRed: '#C86D5A',
  savingsWarmEarth: '#C4A484',

  // Semantic
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Muted / warm neutral for "at projection" state
  warmNeutral: '#A8A29E',

  // Positive / negative semantic
  positiveGreen: '#22C55E',
  positiveBgGreen: '#DCFCE7',
  positiveTextGreen: '#166534',
  negativeBgRed: '#FDF2F0',

  // Today highlight (calendar)
  todayHighlight: '#6366F1',
} as const;

// ── Badge tokens ───────────────────────────────────────────────────────────

export const BADGE = {
  borderRadius: 99,
  fontSize: 11,
  fontWeight: '500' as const,
  paddingHorizontal: 8,
  paddingVertical: 2,
} as const;

// ── Button tokens ──────────────────────────────────────────────────────────

export const BUTTON = {
  primary: {
    bg: '#44403C',
    bgHover: '#292524',
    text: '#FAFAF9',
    borderRadius: 8,
  },
  accent: {
    bg: '#C86D5A',
    bgHover: '#b85e4c',
    text: '#FFFFFF',
    borderRadius: 8,
  },
  secondary: {
    bg: 'transparent',
    bgHover: '#F5F5F4',
    text: '#44403C',
    border: '#D6D3D1',
    borderRadius: 8,
  },
} as const;

// ── Progress bar tokens ────────────────────────────────────────────────────

export const PROGRESS_BAR = {
  height: 6,
  borderRadius: 9999,
  trackColor: '#E7E5E4',
  incomeFill: '#6B6F69',
  expenseFill: '#C86D5A',
  atBudgetFill: '#A8A29E',
  overBudgetFill: '#C86D5A',
} as const;

// ── Typography scale ───────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  pageTitle: { fontSize: 20, fontWeight: '500' as const },
  sectionHeading: { fontSize: 16, fontWeight: '500' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
  muted: { fontSize: 12, fontWeight: '400' as const, color: '#A8A29E' },
  balance: { fontSize: 34, fontWeight: '300' as const },
  cardAmount: { fontSize: 22, fontWeight: '300' as const },
  uppercaseLabel: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

export const tokens = createTokens({
  color: {
    ...COLOR,
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    full: 9999,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});
