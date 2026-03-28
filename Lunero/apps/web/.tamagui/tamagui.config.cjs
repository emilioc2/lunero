var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tamagui.config.ts
var tamagui_config_exports = {};
__export(tamagui_config_exports, {
  default: () => tamaguiConfig,
  tamaguiConfig: () => tamaguiConfig
});
module.exports = __toCommonJS(tamagui_config_exports);

// ../../packages/ui/src/tamagui.config.ts
var import_core3 = require("@tamagui/core");

// ../../packages/ui/src/tokens.ts
var import_core = require("@tamagui/core");
var COLOR = {
  // Warm neutrals
  stone50: "#FAFAF9",
  stone100: "#F5F5F4",
  stone200: "#E7E5E4",
  stone300: "#D6D3D1",
  stone400: "#A8A29E",
  stone500: "#78716C",
  stone600: "#57534E",
  stone700: "#44403C",
  stone800: "#292524",
  stone900: "#1C1917",
  // Category colors
  incomeOliveGray: "#6B6F69",
  expenseClayRed: "#C86D5A",
  savingsWarmEarth: "#C4A484",
  // Semantic
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
  // Muted / warm neutral for "at projection" state
  warmNeutral: "#A8A29E",
  // Positive / negative semantic
  positiveGreen: "#22C55E",
  positiveBgGreen: "#DCFCE7",
  positiveTextGreen: "#166534",
  negativeBgRed: "#FDF2F0",
  // Today highlight (calendar)
  todayHighlight: "#6366F1"
};
var tokens = (0, import_core.createTokens)({
  color: {
    ...COLOR
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
    true: 16
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
    true: 16
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    full: 9999,
    true: 8
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500
  }
});

// ../../packages/ui/src/themes.ts
var import_core2 = require("@tamagui/core");
var lightTheme = (0, import_core2.createTheme)({
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
  // Positive / negative
  positiveGreen: COLOR.positiveGreen,
  positiveBgGreen: COLOR.positiveBgGreen,
  positiveTextGreen: COLOR.positiveTextGreen,
  negativeBgRed: COLOR.negativeBgRed,
  todayHighlight: COLOR.todayHighlight,
  // Input
  inputBackground: COLOR.white,
  inputBorder: COLOR.stone300,
  inputBorderFocus: COLOR.stone500
});
var darkTheme = (0, import_core2.createTheme)({
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
  // Positive / negative (same hues work in dark mode)
  positiveGreen: COLOR.positiveGreen,
  positiveBgGreen: "#064E3B",
  positiveTextGreen: "#6EE7B7",
  negativeBgRed: "#451A1A",
  todayHighlight: COLOR.todayHighlight,
  // Input
  inputBackground: COLOR.stone800,
  inputBorder: COLOR.stone600,
  inputBorderFocus: COLOR.stone400
});
var themes = {
  light: lightTheme,
  dark: darkTheme
};

// ../../packages/ui/src/tamagui.config.ts
var tamaguiConfig = (0, import_core3.createTamagui)({
  tokens,
  themes,
  // Shorthands for common style props
  shorthands: {
    p: "padding",
    px: "paddingHorizontal",
    py: "paddingVertical",
    pt: "paddingTop",
    pb: "paddingBottom",
    pl: "paddingLeft",
    pr: "paddingRight",
    m: "margin",
    mx: "marginHorizontal",
    my: "marginVertical",
    mt: "marginTop",
    mb: "marginBottom",
    ml: "marginLeft",
    mr: "marginRight",
    bg: "backgroundColor",
    br: "borderRadius",
    bw: "borderWidth",
    bc: "borderColor",
    f: "flex",
    fw: "flexWrap",
    fd: "flexDirection",
    ai: "alignItems",
    jc: "justifyContent",
    gap: "gap",
    w: "width",
    h: "height",
    mw: "maxWidth",
    mh: "maxHeight"
  },
  media: {
    sm: { maxWidth: 640 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
    xl: { maxWidth: 1280 }
  },
  settings: {
    allowedStyleValues: "somewhat-strict"
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  tamaguiConfig
});
