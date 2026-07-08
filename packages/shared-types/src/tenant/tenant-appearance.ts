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

export const colorSchemeValuesSchema = z
  .object({
    light: z.string().trim().min(1).optional(),
    dark: z.string().trim().min(1).optional(),
  })
  .partial();

export type ColorSchemeValues = z.infer<typeof colorSchemeValuesSchema>;

export const tenantSemanticsBySchemeSchema = z
  .object({
    light: z.record(z.string(), z.string()).optional(),
    dark: z.record(z.string(), z.string()).optional(),
  })
  .partial();

export type TenantSemanticsByScheme = z.infer<
  typeof tenantSemanticsBySchemeSchema
>;

export const tenantColorsBySchemeSchema = z
  .object({
    light: z.record(z.string(), z.string()).optional(),
    dark: z.record(z.string(), z.string()).optional(),
  })
  .partial();

export type TenantColorsByScheme = z.infer<typeof tenantColorsBySchemeSchema>;

export const tenantCardGlowSchema = z
  .object({
    blue: z.string().trim().min(1).optional(),
    green: z.string().trim().min(1).optional(),
    red: z.string().trim().min(1).optional(),
    gold: z.string().trim().min(1).optional(),
    neutral: z.string().trim().min(1).optional(),
    success: z.string().trim().min(1).optional(),
    danger: z.string().trim().min(1).optional(),
    warning: z.string().trim().min(1).optional(),
  })
  .partial();

export type TenantCardGlow = z.infer<typeof tenantCardGlowSchema>;

export const tenantAppearanceEffectsSchema = z
  .object({
    shadowCard: colorSchemeValuesSchema.optional(),
    gradientPrimary: colorSchemeValuesSchema.optional(),
    backgroundApp: colorSchemeValuesSchema.optional(),
    gradientGlowBorder: colorSchemeValuesSchema.optional(),
    shadowGlowBorder: colorSchemeValuesSchema.optional(),
    backdropFilterCard: colorSchemeValuesSchema.optional(),
    cardGlow: tenantCardGlowSchema.optional(),
  })
  .partial();

export type TenantAppearanceEffects = z.infer<
  typeof tenantAppearanceEffectsSchema
>;

export const tenantChartColorsSchema = z
  .object({
    chart1: z.string().trim().min(1).optional(),
    chart2: z.string().trim().min(1).optional(),
    chart3: z.string().trim().min(1).optional(),
    chart4: z.string().trim().min(1).optional(),
    glow1: z.string().trim().min(1).optional(),
    glow2: z.string().trim().min(1).optional(),
    glow3: z.string().trim().min(1).optional(),
    glow4: z.string().trim().min(1).optional(),
  })
  .partial();

export type TenantChartColors = z.infer<typeof tenantChartColorsSchema>;

export const tenantSpacingScaleSchema = z
  .object({
    xs: z.string().trim().min(1).optional(),
    sm: z.string().trim().min(1).optional(),
    md: z.string().trim().min(1).optional(),
    base: z.string().trim().min(1).optional(),
    lg: z.string().trim().min(1).optional(),
  })
  .partial();

export type TenantSpacingScale = z.infer<typeof tenantSpacingScaleSchema>;

export const tenantCustomTokenKindSchema = z.enum(["color", "gradient"]);

export type TenantCustomTokenKind = z.infer<typeof tenantCustomTokenKindSchema>;

export const tenantCustomTokenSchema = z.object({
  kind: tenantCustomTokenKindSchema,
  name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().trim().min(1).optional(),
  light: z.string().trim().min(1).optional(),
  dark: z.string().trim().min(1).optional(),
});

export type TenantCustomToken = z.infer<typeof tenantCustomTokenSchema>;

export const tenantCustomTokensSchema = z
  .array(tenantCustomTokenSchema)
  .max(32);

export type TenantCustomTokens = z.infer<typeof tenantCustomTokensSchema>;

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

/** Removed preset ids still accepted when reading persisted tenant appearance. */
export const LEGACY_REMOVED_APPEARANCE_PRESETS = [
  "sophisticated-glass-glow",
  "sophisticated-glass-glow-v2",
] as const;

export type AppearancePreset = (typeof APPEARANCE_PRESETS)[number];

export const appearancePresetSchema = z
  .union([
    z.enum(APPEARANCE_PRESETS),
    z.literal("instagram"),
    z.enum(LEGACY_REMOVED_APPEARANCE_PRESETS),
  ])
  .transform((value): AppearancePreset | undefined => {
    if (value === "instagram") {
      return "soft";
    }
    if (
      (LEGACY_REMOVED_APPEARANCE_PRESETS as readonly string[]).includes(value)
    ) {
      return undefined;
    }
    return value as AppearancePreset;
  });

export const tenantAppearanceSchema = z
  .object({
    logoUrl: z.string().url().optional(),
    preset: appearancePresetSchema.optional(),
    palettes: tenantColorPalettesSchema.optional(),
    semantics: z.record(z.string(), z.string()).optional(),
    semanticsByScheme: tenantSemanticsBySchemeSchema.optional(),
    colors: z.record(z.string(), z.string()).optional(),
    colorsByScheme: tenantColorsBySchemeSchema.optional(),
    effects: tenantAppearanceEffectsSchema.optional(),
    chartColors: tenantChartColorsSchema.optional(),
    fontFamily: z.string().trim().min(1).optional(),
    fontSizes: tenantFontSizesSchema.optional(),
    radius: z.string().trim().min(1).optional(),
    radiusSm: z.string().trim().min(1).optional(),
    /** @deprecated Use spacingScale.base for macro layout spacing. */
    spacing: z.string().trim().min(1).optional(),
    spacingScale: tenantSpacingScaleSchema.optional(),
    customTokens: tenantCustomTokensSchema.optional(),
  })
  .partial();

export type TenantAppearance = z.infer<typeof tenantAppearanceSchema>;
