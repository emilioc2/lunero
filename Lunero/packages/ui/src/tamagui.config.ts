import { createTamagui } from '@tamagui/core';
import { tokens } from './tokens';
import { themes } from './themes';

export const tamaguiConfig = createTamagui({
  tokens,
  themes,
  // Shorthands for common style props
  shorthands: {
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    pt: 'paddingTop',
    pb: 'paddingBottom',
    pl: 'paddingLeft',
    pr: 'paddingRight',
    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    mt: 'marginTop',
    mb: 'marginBottom',
    ml: 'marginLeft',
    mr: 'marginRight',
    bg: 'backgroundColor',
    br: 'borderRadius',
    bw: 'borderWidth',
    bc: 'borderColor',
    f: 'flex',
    fw: 'flexWrap',
    fd: 'flexDirection',
    ai: 'alignItems',
    jc: 'justifyContent',
    gap: 'gap',
    w: 'width',
    h: 'height',
    mw: 'maxWidth',
    mh: 'maxHeight',
  } as const,
  media: {
    sm: { maxWidth: 640 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
    xl: { maxWidth: 1280 },
  },
  settings: {
    allowedStyleValues: 'somewhat-strict',
  },
});

export type AppConfig = typeof tamaguiConfig;

// Augment Tamagui's type system with our config
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}
