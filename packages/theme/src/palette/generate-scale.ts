/// <reference path="../types/culori.d.ts" />
import { converter, formatHex, parse, type Oklch } from "culori";

import {
  DEFAULT_NEUTRAL_SCALE,
  DEFAULT_PRIMARY_SCALE,
  type PaletteKind,
} from "./default-scales.js";
import {
  COLOR_SCALE_STEPS,
  isColorScaleStep,
  type ColorScaleStep,
} from "./scale-steps.js";

const toOklch = converter("oklch");

export interface ColorPaletteConfig {
  readonly anchorStep?: ColorScaleStep;
  readonly anchorColor?: string;
  readonly shadeOverrides?: Partial<Record<ColorScaleStep, string>>;
}

export interface GenerateColorScaleInput {
  readonly anchorColor: string;
  readonly anchorStep: ColorScaleStep;
  readonly referenceScale: Record<ColorScaleStep, string>;
  readonly shadeOverrides?: Partial<Record<ColorScaleStep, string>>;
}

function readOklch(hex: string): Oklch {
  const color = parse(hex);
  if (!color) {
    throw new Error(`Invalid color: ${hex}`);
  }
  const oklch = toOklch(color);
  if (!oklch || typeof oklch.l !== "number" || typeof oklch.c !== "number") {
    throw new Error(`Unable to convert color to OKLCH: ${hex}`);
  }
  const hue =
    typeof oklch.h === "number" && !Number.isNaN(oklch.h) ? oklch.h : 0;
  return { ...oklch, h: hue };
}

export function normalizeHexColor(value: string): string {
  const parsed = parse(value.trim());
  if (!parsed) {
    throw new Error(`Invalid color: ${value}`);
  }
  const hex = formatHex(parsed);
  if (!hex) {
    throw new Error(`Invalid color: ${value}`);
  }
  return hex.toLowerCase();
}

export function generateColorScale(
  input: GenerateColorScaleInput,
): Record<ColorScaleStep, string> {
  const anchorHex = normalizeHexColor(input.anchorColor);
  const anchorOklch = readOklch(anchorHex);
  const referenceAnchor = readOklch(input.referenceScale[input.anchorStep]);

  const generated = {} as Record<ColorScaleStep, string>;

  for (const step of COLOR_SCALE_STEPS) {
    if (step === input.anchorStep) {
      generated[step] = anchorHex;
      continue;
    }

    const referenceStep = readOklch(input.referenceScale[step]);
    const deltaL = referenceStep.l - referenceAnchor.l;
    const deltaC = referenceStep.c - referenceAnchor.c;

    const candidate = {
      mode: "oklch" as const,
      l: clamp(anchorOklch.l + deltaL, 0, 1),
      c: Math.max(0, anchorOklch.c + deltaC),
      h: anchorOklch.h,
    };

    generated[step] = normalizeHexColor(formatHex(candidate) ?? anchorHex);
  }

  if (input.shadeOverrides) {
    for (const [step, value] of Object.entries(input.shadeOverrides)) {
      if (value?.trim() && isColorScaleStep(step)) {
        generated[step] = normalizeHexColor(value);
      }
    }
  }

  return generated;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function paletteToCssVariables(
  kind: PaletteKind,
  scale: Record<ColorScaleStep, string>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const step of COLOR_SCALE_STEPS) {
    vars[`--color-${kind}-${step}`] = scale[step];
  }
  return vars;
}

export function expandPaletteConfig(
  kind: PaletteKind,
  config: ColorPaletteConfig | undefined,
): Record<string, string> {
  if (!config?.anchorStep || !config.anchorColor?.trim()) {
    return {};
  }

  const referenceScale =
    kind === "primary" ? DEFAULT_PRIMARY_SCALE : DEFAULT_NEUTRAL_SCALE;

  const scale = generateColorScale({
    anchorColor: config.anchorColor,
    anchorStep: config.anchorStep,
    referenceScale,
    shadeOverrides: config.shadeOverrides,
  });

  return paletteToCssVariables(kind, scale);
}

const PALETTE_CSS_VAR_PATTERN =
  /^--color-(primary|neutral)-(50|100|200|300|400|500|600|700|800|900|950)$/;

export function isPaletteCssVar(key: string): boolean {
  return PALETTE_CSS_VAR_PATTERN.test(key);
}

export function inferPaletteFromLegacyColors(
  kind: PaletteKind,
  colors: Readonly<Record<string, string>> | undefined,
): ColorPaletteConfig | undefined {
  if (!colors) {
    return undefined;
  }

  const prefix = `--color-${kind}-`;
  const shadeOverrides: Partial<Record<ColorScaleStep, string>> = {};

  for (const step of COLOR_SCALE_STEPS) {
    const value = colors[`${prefix}${step}`]?.trim();
    if (value) {
      shadeOverrides[step] = normalizeHexColor(value);
    }
  }

  if (Object.keys(shadeOverrides).length === 0) {
    return undefined;
  }

  const anchorStep: ColorScaleStep =
    shadeOverrides["500"] !== undefined
      ? "500"
      : (Object.keys(shadeOverrides).find(isColorScaleStep) as ColorScaleStep);

  const anchorColor =
    shadeOverrides[anchorStep] ??
    (kind === "primary"
      ? DEFAULT_PRIMARY_SCALE[anchorStep]
      : DEFAULT_NEUTRAL_SCALE[anchorStep]);

  return {
    anchorStep,
    anchorColor,
    shadeOverrides,
  };
}

export interface AppearancePaletteInput {
  readonly palettes?: {
    readonly primary?: ColorPaletteConfig;
    readonly neutral?: ColorPaletteConfig;
  };
  readonly colors?: Readonly<Record<string, string>>;
}

export function expandAppearancePalettes(
  appearance: AppearancePaletteInput,
): Record<string, string> {
  const vars: Record<string, string> = {};

  const primaryConfig =
    appearance.palettes?.primary ??
    inferPaletteFromLegacyColors("primary", appearance.colors);
  const neutralConfig =
    appearance.palettes?.neutral ??
    inferPaletteFromLegacyColors("neutral", appearance.colors);

  Object.assign(vars, expandPaletteConfig("primary", primaryConfig));
  Object.assign(vars, expandPaletteConfig("neutral", neutralConfig));

  if (appearance.colors) {
    for (const [key, value] of Object.entries(appearance.colors)) {
      if (value.trim() && !isPaletteCssVar(key)) {
        vars[key.startsWith("--") ? key : `--${key}`] = value;
      }
    }
  }

  return vars;
}
