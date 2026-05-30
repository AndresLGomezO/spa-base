import { z } from "zod";

export const COLOR_SCALE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

export const colorScaleStepSchema = z.enum(COLOR_SCALE_STEPS);

export type ColorScaleStep = z.infer<typeof colorScaleStepSchema>;

export const colorPaletteSchema = z
  .object({
    anchorStep: colorScaleStepSchema,
    anchorColor: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/),
    shadeOverrides: z.record(z.string(), z.string()).optional(),
  })
  .partial();

export type ColorPaletteConfig = z.infer<typeof colorPaletteSchema>;

export const tenantColorPalettesSchema = z
  .object({
    primary: colorPaletteSchema.optional(),
    neutral: colorPaletteSchema.optional(),
  })
  .partial();

export type TenantColorPalettes = z.infer<typeof tenantColorPalettesSchema>;

export const tenantFontSizesSchema = z
  .object({
    body: z.string().trim().min(1).optional(),
    heading: z.string().trim().min(1).optional(),
  })
  .partial();

export type TenantFontSizes = z.infer<typeof tenantFontSizesSchema>;

export const APPEARANCE_PRESETS = [
  "default",
  "soft",
  "bold",
  "elegant",
  "sophisticated",
  "professional",
  "business",
  "frutigerAero",
] as const;

export const appearancePresetSchema = z
  .union([z.enum(APPEARANCE_PRESETS), z.literal("instagram")])
  .transform((value) => (value === "instagram" ? "soft" : value));

export type AppearancePreset = z.infer<typeof appearancePresetSchema>;

export const tenantAppearanceSchema = z
  .object({
    logoUrl: z.string().url().optional(),
    preset: appearancePresetSchema.optional(),
    palettes: tenantColorPalettesSchema.optional(),
    semantics: z.record(z.string(), z.string()).optional(),
    colors: z.record(z.string(), z.string()).optional(),
    fontFamily: z.string().trim().min(1).optional(),
    fontSizes: tenantFontSizesSchema.optional(),
    radius: z.string().trim().min(1).optional(),
    spacing: z.string().trim().min(1).optional(),
  })
  .partial();

export type TenantAppearance = z.infer<typeof tenantAppearanceSchema>;
