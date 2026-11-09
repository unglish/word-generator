/**
 * Unglish grayscale palette for the vendored Chimera 3D head.
 * Same property names as Chimera's phosphor `V` so anatomy3d/beams3d need no call-site edits.
 * Mutate via `syncTheme()` when prefers-color-scheme changes.
 */

export const V = {
  blue: "#444444",
  blueMid: "#666666",
  blueDim: "#888888",
  frame: "#c5c5c5",
  green: "#333333",
  red: "#555555",
  pink: "#777777",
  white: "#191919",
  amber: "#4a4a4a",
};

export const SLOTS = [V.green, V.red, V.pink, V.white] as const;

export const TEXT = {
  primary: "#191919",
  secondary: "#626262",
} as const;

/** WebGL clear / fog (CSS hex without # for THREE parsing via setStyle, or 0xRRGGBB). */
export let clearHex = 0xf3f3f3;
export let clearCss = "#f3f3f3";

const LIGHT = {
  blue: "#444444",
  blueMid: "#666666",
  blueDim: "#8a8a8a",
  frame: "#c5c5c5",
  green: "#2a2a2a",
  red: "#4a4a4a",
  pink: "#6a6a6a",
  white: "#191919",
  amber: "#3a3a3a",
  clear: 0xf3f3f3,
  clearCss: "#f3f3f3",
  textPrimary: "#191919",
  textSecondary: "#626262",
  heat: [
    [0, "#e8e8e8"],
    [0.35, "#b0b0b0"],
    [0.6, "#787878"],
    [0.82, "#404040"],
    [1, "#1a1a1a"],
  ] as [number, string][],
  particle: "#555555",
  spark: "#222222",
};

const DARK = {
  blue: "#c8c8c8",
  blueMid: "#a0a0a0",
  blueDim: "#707070",
  frame: "#666666",
  green: "#e8e8e8",
  red: "#d0d0d0",
  pink: "#b8b8b8",
  white: "#f0f0f0",
  amber: "#bcbcbc",
  clear: 0x1a1a1a,
  clearCss: "#1a1a1a",
  textPrimary: "#eeeeee",
  textSecondary: "#b3b3b3",
  heat: [
    [0, "#2a2a2a"],
    [0.35, "#5a5a5a"],
    [0.6, "#8a8a8a"],
    [0.82, "#c0c0c0"],
    [1, "#f2f2f2"],
  ] as [number, string][],
  particle: "#d8d8d8",
  spark: "#f4f4f4",
};

let HEAT: [number, string][] = LIGHT.heat;
export let particleColor = LIGHT.particle;
export let sparkColor = LIGHT.spark;
export let isDarkTheme = false;

/** mix two #rrggbb colours */
export function mix(hex: string, to: string, u: number): string {
  const a = parseInt(hex.slice(1), 16),
    b = parseInt(to.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - u) + ((b >> s) & 255) * u);
  return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
}

/** core of a bright beam — toward page foreground */
export const core = (hex: string): string => mix(hex, isDarkTheme ? "#ffffff" : "#000000", 0.45);

/** sound / pressure level 0..1 → grayscale ramp */
export function heat(level: number): string {
  const v = Math.max(0, Math.min(1, level));
  for (let i = 1; i < HEAT.length; i++) {
    if (v <= HEAT[i][0]) {
      return mix(HEAT[i - 1][1], HEAT[i][1], (v - HEAT[i - 1][0]) / (HEAT[i][0] - HEAT[i - 1][0]));
    }
  }
  return HEAT[HEAT.length - 1][1];
}

export const C = {
  black: "#000000",
  console: "#000000",
  inset: "#000000",
  line: V.frame,
  text: V.blue,
  textDim: V.blueMid,
  caliper: V.amber,
  caliperDim: "rgba(100, 100, 100, 0.45)",
  fat: "#bdbdbd",
  skin: "#a8a8a8",
  muscle: "#5d5d5d",
  tongue: "#6b6b6b",
  brain: "#7c7c7c",
  marrow: "#b2b2b2",
  cortex: "#1c1c1c",
  cartilage: "#3e3e3e",
  mucosa: "#8f8f8f",
  tooth: "#101010",
};

/** Map acoustic pressure RMS (dyn/cm²) to 0..1 on a log scale. */
export const pressureLevel = (rms: number): number => {
  if (!(rms > 0)) return 0;
  const lo = Math.log10(40),
    hi = Math.log10(4000);
  return Math.max(0, Math.min(1, (Math.log10(rms) - lo) / (hi - lo)));
};

function applyPalette(p: typeof LIGHT): void {
  V.blue = p.blue;
  V.blueMid = p.blueMid;
  V.blueDim = p.blueDim;
  V.frame = p.frame;
  V.green = p.green;
  V.red = p.red;
  V.pink = p.pink;
  V.white = p.white;
  V.amber = p.amber;
  clearHex = p.clear;
  clearCss = p.clearCss;
  (TEXT as { primary: string }).primary = p.textPrimary;
  (TEXT as { secondary: string }).secondary = p.textSecondary;
  HEAT = p.heat;
  particleColor = p.particle;
  sparkColor = p.spark;
  C.line = V.frame;
  C.text = V.blue;
  C.textDim = V.blueMid;
  C.caliper = V.amber;
}

/** Match `prefers-color-scheme` (Unglish demo light/dark). */
export function syncTheme(dark = matchMedia("(prefers-color-scheme: dark)").matches): void {
  isDarkTheme = dark;
  applyPalette(dark ? DARK : LIGHT);
}

syncTheme();
