import type { TenantAppearanceLike } from "../tenant-overrides.js";
import {
  APPEARANCE_PRESET_CATALOG,
  NAMED_APPEARANCE_PRESETS,
  type NamedAppearancePreset,
} from "./catalog.js";

export const APPEARANCE_PRESETS = [
  "default",
  ...NAMED_APPEARANCE_PRESETS,
] as const;

export type AppearancePreset = (typeof APPEARANCE_PRESETS)[number];

/** @deprecated Renamed to `soft`; still accepted when loading saved appearance. */
const LEGACY_PRESET_ALIASES: Record<string, AppearancePreset> = {
  instagram: "soft",
};

/** Glass presets removed — appearance tokens are stored directly on the tenant. */
const LEGACY_REMOVED_PRESET_IDS = new Set([
  "sophisticated-glass-glow",
  "sophisticated-glass-glow-v2",
]);

export function isAppearancePreset(value: string): value is AppearancePreset {
  return (APPEARANCE_PRESETS as readonly string[]).includes(value);
}

export function normalizeAppearancePreset(
  preset: string | undefined,
): AppearancePreset {
  if (!preset || preset === "default") {
    return "default";
  }
  if (LEGACY_REMOVED_PRESET_IDS.has(preset)) {
    return "default";
  }
  if (isAppearancePreset(preset)) {
    return preset;
  }
  return LEGACY_PRESET_ALIASES[preset] ?? "default";
}

export function applyAppearancePreset(
  appearance: TenantAppearanceLike,
): TenantAppearanceLike {
  const presetId = normalizeAppearancePreset(appearance.preset);
  if (presetId === "default") {
    return { ...appearance, preset: undefined };
  }

  const base = APPEARANCE_PRESET_CATALOG[presetId as NamedAppearancePreset];
  if (!base) {
    return appearance;
  }

  return {
    ...base,
    ...appearance,
    preset: presetId,
    palettes: {
      ...base.palettes,
      ...appearance.palettes,
    },
    semantics: {
      ...base.semantics,
      ...appearance.semantics,
    },
    colors: {
      ...base.colors,
      ...appearance.colors,
    },
    fontSizes: {
      ...base.fontSizes,
      ...appearance.fontSizes,
    },
  };
}

export {
  APPEARANCE_PRESET_CATALOG,
  BOLD_APPEARANCE_PRESET,
  BUSINESS_APPEARANCE_PRESET,
  ELEGANT_APPEARANCE_PRESET,
  FRUTIGER_AERO_APPEARANCE_PRESET,
  NAMED_APPEARANCE_PRESETS,
  PROFESSIONAL_APPEARANCE_PRESET,
  SOFT_APPEARANCE_PRESET,
  SOPHISTICATED_APPEARANCE_PRESET,
  type NamedAppearancePreset,
} from "./catalog.js";
