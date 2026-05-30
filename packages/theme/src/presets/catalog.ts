import type { TenantAppearanceLike } from "../tenant-overrides.js";

export const NAMED_APPEARANCE_PRESETS = [
  "soft",
  "bold",
  "elegant",
  "sophisticated",
  "professional",
  "business",
  "frutigerAero",
] as const;

export type NamedAppearancePreset = (typeof NAMED_APPEARANCE_PRESETS)[number];

/**
 * Presets only set primary/neutral palettes. Semantic tokens (background,
 * foreground, card, etc.) are derived in semantics.css and remapped in dark.css
 * so both color schemes stay consistent when toggling light/dark.
 */
export const APPEARANCE_PRESET_CATALOG: Record<
  NamedAppearancePreset,
  TenantAppearanceLike
> = {
  soft: {
    preset: "soft",
    palettes: {
      primary: { anchorStep: "500", anchorColor: "#2563eb" },
      neutral: { anchorStep: "50", anchorColor: "#fafafa" },
    },
  },

  bold: {
    preset: "bold",
    palettes: {
      primary: { anchorStep: "600", anchorColor: "#7c3aed" },
      neutral: { anchorStep: "100", anchorColor: "#f4f4f5" },
    },
  },

  elegant: {
    preset: "elegant",
    palettes: {
      primary: { anchorStep: "700", anchorColor: "#5c4033" },
      neutral: { anchorStep: "50", anchorColor: "#f7f3ef" },
    },
  },

  sophisticated: {
    preset: "sophisticated",
    palettes: {
      primary: { anchorStep: "600", anchorColor: "#0f766e" },
      neutral: { anchorStep: "50", anchorColor: "#f1f5f9" },
    },
  },

  professional: {
    preset: "professional",
    palettes: {
      primary: { anchorStep: "600", anchorColor: "#1e40af" },
      neutral: { anchorStep: "50", anchorColor: "#f8fafc" },
    },
  },

  business: {
    preset: "business",
    palettes: {
      primary: { anchorStep: "700", anchorColor: "#1e3a8a" },
      neutral: { anchorStep: "100", anchorColor: "#f4f4f5" },
    },
  },

  frutigerAero: {
    preset: "frutigerAero",
    palettes: {
      primary: { anchorStep: "500", anchorColor: "#00a6d6" },
      neutral: { anchorStep: "100", anchorColor: "#e0f4ff" },
    },
  },
};

export const SOFT_APPEARANCE_PRESET = APPEARANCE_PRESET_CATALOG.soft;
export const BOLD_APPEARANCE_PRESET = APPEARANCE_PRESET_CATALOG.bold;
export const ELEGANT_APPEARANCE_PRESET = APPEARANCE_PRESET_CATALOG.elegant;
export const SOPHISTICATED_APPEARANCE_PRESET =
  APPEARANCE_PRESET_CATALOG.sophisticated;
export const PROFESSIONAL_APPEARANCE_PRESET =
  APPEARANCE_PRESET_CATALOG.professional;
export const BUSINESS_APPEARANCE_PRESET = APPEARANCE_PRESET_CATALOG.business;
export const FRUTIGER_AERO_APPEARANCE_PRESET =
  APPEARANCE_PRESET_CATALOG.frutigerAero;
