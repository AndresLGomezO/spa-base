import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  FieldLabel,
  Form,
  Input,
  JsonImportTriggerButton,
  JsonViewTriggerButton,
  PhotoUpload,
  Text,
  toast,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import {
  APPEARANCE_PRESETS,
  type AppearancePreset,
  type ColorPaletteConfig,
  type TenantAppearance,
  type TenantAppearanceEffects,
  type TenantChartColors,
  type TenantCustomToken,
  type TenantCustomTokenKind,
  type TenantSpacingScale,
} from "@repo/shared-types";
import { useColorScheme } from "@repo/theme/react";
import {
  applyAppearancePreset,
  appearanceToCssVariables,
  inferPaletteFromLegacyColors,
  MAX_CUSTOM_TOKENS,
  normalizeAppearancePreset,
  normalizeHexColor,
  resolveCustomTokenCssVar,
  sanitizeCustomTokens,
  TENANT_OVERRIDE_GROUPS,
  type TenantAppearanceLike,
} from "@repo/theme/tenant-overrides";

import { useAuth } from "../../auth/AuthContext";
import { useJsonActionTriggerLabels } from "../json/json-action-trigger-labels";
import { FormModal } from "../forms/FormModal";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import {
  getAdminTenant,
  updateAdminTenant,
  uploadTenantLogo,
  type AdminTenant,
} from "../../lib/admin-client";
import { ColorPaletteEditor } from "./ColorPaletteEditor";
import { TenantThemeJsonImportDialog } from "./TenantThemeJsonImportDialog";
import { tenantThemeJsonLabels } from "./tenant-theme-json-labels";
import { TenantThemeJsonViewDialog } from "./TenantThemeJsonViewDialog";

interface TenantAppearanceEditorProps {
  readonly tenantId: string;
}

type EditorColorScheme = "light" | "dark";

interface SemanticsBySchemeState {
  readonly light: Record<string, string>;
  readonly dark: Record<string, string>;
}

interface ColorsBySchemeState {
  readonly light: Record<string, string>;
  readonly dark: Record<string, string>;
}

interface EffectsState {
  readonly shadowCard: { readonly light: string; readonly dark: string };
  readonly gradientPrimary: { readonly light: string; readonly dark: string };
  readonly backgroundApp: { readonly light: string; readonly dark: string };
  readonly gradientGlowBorder: {
    readonly light: string;
    readonly dark: string;
  };
  readonly shadowGlowBorder: { readonly light: string; readonly dark: string };
  readonly backdropFilterCard: {
    readonly light: string;
    readonly dark: string;
  };
  readonly cardGlow: {
    readonly blue: string;
    readonly green: string;
    readonly red: string;
    readonly gold: string;
    readonly neutral: string;
    readonly success: string;
    readonly danger: string;
    readonly warning: string;
  };
}

interface ChartColorsState {
  readonly chart1: string;
  readonly chart2: string;
  readonly chart3: string;
  readonly chart4: string;
  readonly glow1: string;
  readonly glow2: string;
  readonly glow3: string;
  readonly glow4: string;
}

interface CustomTokenRowState {
  readonly id: string;
  readonly kind: TenantCustomTokenKind;
  readonly name: string;
  readonly label: string;
  readonly light: string;
  readonly dark: string;
}

interface SpacingScaleState {
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly base: string;
  readonly lg: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Invalid file data."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

const SIDEBAR_CSS_VARS = new Set<string>(TENANT_OVERRIDE_GROUPS.sidebar);

const CHART_COLOR_KEYS = [
  { key: "chart1" as const, cssVar: "--color-chart-1" },
  { key: "chart2" as const, cssVar: "--color-chart-2" },
  { key: "chart3" as const, cssVar: "--color-chart-3" },
  { key: "chart4" as const, cssVar: "--color-chart-4" },
];

const CHART_GLOW_COLOR_KEYS = [
  { key: "glow1" as const, cssVar: "--color-chart-glow-1" },
  { key: "glow2" as const, cssVar: "--color-chart-glow-2" },
  { key: "glow3" as const, cssVar: "--color-chart-glow-3" },
  { key: "glow4" as const, cssVar: "--color-chart-glow-4" },
];

const CARD_GLOW_LEGACY_KEYS = ["blue", "green", "red", "gold"] as const;
const CARD_GLOW_SEMANTIC_KEYS = [
  "neutral",
  "success",
  "danger",
  "warning",
] as const;

const EMPTY_EFFECTS: EffectsState = {
  shadowCard: { light: "", dark: "" },
  gradientPrimary: { light: "", dark: "" },
  backgroundApp: { light: "", dark: "" },
  gradientGlowBorder: { light: "", dark: "" },
  shadowGlowBorder: { light: "", dark: "" },
  backdropFilterCard: { light: "", dark: "" },
  cardGlow: {
    blue: "",
    green: "",
    red: "",
    gold: "",
    neutral: "",
    success: "",
    danger: "",
    warning: "",
  },
};

const SELECTABLE_THEME_PRESETS = APPEARANCE_PRESETS.filter(
  (id): id is Exclude<AppearancePreset, "default"> => id !== "default",
);

const EMPTY_CHART_COLORS: ChartColorsState = {
  chart1: "",
  chart2: "",
  chart3: "",
  chart4: "",
  glow1: "",
  glow2: "",
  glow3: "",
  glow4: "",
};

function createCustomTokenRow(token?: TenantCustomToken): CustomTokenRowState {
  return {
    id: crypto.randomUUID(),
    kind: token?.kind ?? "color",
    name: token?.name ?? "",
    label: token?.label ?? "",
    light: token?.light ?? "",
    dark: token?.dark ?? "",
  };
}

const EMPTY_SPACING_SCALE: SpacingScaleState = {
  xs: "",
  sm: "",
  md: "",
  base: "",
  lg: "",
};

function normalizeCssVarKey(key: string): string {
  return key.startsWith("--") ? key : `--${key}`;
}

function extractSidebarColors(
  colors: Record<string, string> | undefined,
): Record<string, string> {
  if (!colors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(colors).filter(([key]) =>
      SIDEBAR_CSS_VARS.has(normalizeCssVarKey(key)),
    ),
  );
}

function loadSemanticsByScheme(
  appearance: TenantAppearance | undefined,
): SemanticsBySchemeState {
  return {
    light: {
      ...(appearance?.semantics ?? {}),
      ...(appearance?.semanticsByScheme?.light ?? {}),
    },
    dark: { ...(appearance?.semanticsByScheme?.dark ?? {}) },
  };
}

function loadColorsByScheme(
  appearance: TenantAppearance | undefined,
): ColorsBySchemeState {
  return {
    light: {
      ...extractSidebarColors(appearance?.colors),
      ...(appearance?.colorsByScheme?.light ?? {}),
    },
    dark: { ...(appearance?.colorsByScheme?.dark ?? {}) },
  };
}

function loadEffects(appearance: TenantAppearance | undefined): EffectsState {
  return {
    shadowCard: {
      light: appearance?.effects?.shadowCard?.light ?? "",
      dark: appearance?.effects?.shadowCard?.dark ?? "",
    },
    gradientPrimary: {
      light: appearance?.effects?.gradientPrimary?.light ?? "",
      dark: appearance?.effects?.gradientPrimary?.dark ?? "",
    },
    backgroundApp: {
      light: appearance?.effects?.backgroundApp?.light ?? "",
      dark: appearance?.effects?.backgroundApp?.dark ?? "",
    },
    gradientGlowBorder: {
      light: appearance?.effects?.gradientGlowBorder?.light ?? "",
      dark: appearance?.effects?.gradientGlowBorder?.dark ?? "",
    },
    shadowGlowBorder: {
      light: appearance?.effects?.shadowGlowBorder?.light ?? "",
      dark: appearance?.effects?.shadowGlowBorder?.dark ?? "",
    },
    backdropFilterCard: {
      light: appearance?.effects?.backdropFilterCard?.light ?? "",
      dark: appearance?.effects?.backdropFilterCard?.dark ?? "",
    },
    cardGlow: {
      blue: appearance?.effects?.cardGlow?.blue ?? "",
      green: appearance?.effects?.cardGlow?.green ?? "",
      red: appearance?.effects?.cardGlow?.red ?? "",
      gold: appearance?.effects?.cardGlow?.gold ?? "",
      neutral: appearance?.effects?.cardGlow?.neutral ?? "",
      success: appearance?.effects?.cardGlow?.success ?? "",
      danger: appearance?.effects?.cardGlow?.danger ?? "",
      warning: appearance?.effects?.cardGlow?.warning ?? "",
    },
  };
}

function loadChartColors(
  appearance: TenantAppearance | undefined,
): ChartColorsState {
  return {
    chart1: appearance?.chartColors?.chart1 ?? "",
    chart2: appearance?.chartColors?.chart2 ?? "",
    chart3: appearance?.chartColors?.chart3 ?? "",
    chart4: appearance?.chartColors?.chart4 ?? "",
    glow1: appearance?.chartColors?.glow1 ?? "",
    glow2: appearance?.chartColors?.glow2 ?? "",
    glow3: appearance?.chartColors?.glow3 ?? "",
    glow4: appearance?.chartColors?.glow4 ?? "",
  };
}

function loadCustomTokens(
  appearance: TenantAppearance | undefined,
): CustomTokenRowState[] {
  return (appearance?.customTokens ?? []).map((token) =>
    createCustomTokenRow(token),
  );
}

function loadSpacingScale(
  appearance: TenantAppearance | undefined,
): SpacingScaleState {
  return {
    xs: appearance?.spacingScale?.xs ?? "",
    sm: appearance?.spacingScale?.sm ?? "",
    md: appearance?.spacingScale?.md ?? "",
    base: appearance?.spacingScale?.base ?? appearance?.spacing ?? "",
    lg: appearance?.spacingScale?.lg ?? "",
  };
}

function pruneRecord(
  record: Record<string, string>,
): Record<string, string> | undefined {
  const next = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value.trim()),
  );
  return Object.keys(next).length > 0 ? next : undefined;
}

function pruneSchemeRecord(
  scheme: SemanticsBySchemeState | ColorsBySchemeState,
): TenantAppearance["semanticsByScheme"] {
  const light = pruneRecord(scheme.light);
  const dark = pruneRecord(scheme.dark);
  if (!light && !dark) {
    return undefined;
  }
  return {
    ...(light ? { light } : {}),
    ...(dark ? { dark } : {}),
  };
}

function buildEffectsForSave(
  effects: EffectsState,
): TenantAppearanceEffects | undefined {
  const shadowCard = {
    ...(effects.shadowCard.light.trim()
      ? { light: effects.shadowCard.light.trim() }
      : {}),
    ...(effects.shadowCard.dark.trim()
      ? { dark: effects.shadowCard.dark.trim() }
      : {}),
  };
  const gradientPrimary = {
    ...(effects.gradientPrimary.light.trim()
      ? { light: effects.gradientPrimary.light.trim() }
      : {}),
    ...(effects.gradientPrimary.dark.trim()
      ? { dark: effects.gradientPrimary.dark.trim() }
      : {}),
  };
  const backgroundApp = {
    ...(effects.backgroundApp.light.trim()
      ? { light: effects.backgroundApp.light.trim() }
      : {}),
    ...(effects.backgroundApp.dark.trim()
      ? { dark: effects.backgroundApp.dark.trim() }
      : {}),
  };
  const gradientGlowBorder = {
    ...(effects.gradientGlowBorder.light.trim()
      ? { light: effects.gradientGlowBorder.light.trim() }
      : {}),
    ...(effects.gradientGlowBorder.dark.trim()
      ? { dark: effects.gradientGlowBorder.dark.trim() }
      : {}),
  };
  const shadowGlowBorder = {
    ...(effects.shadowGlowBorder.light.trim()
      ? { light: effects.shadowGlowBorder.light.trim() }
      : {}),
    ...(effects.shadowGlowBorder.dark.trim()
      ? { dark: effects.shadowGlowBorder.dark.trim() }
      : {}),
  };
  const backdropFilterCard = {
    ...(effects.backdropFilterCard.light.trim()
      ? { light: effects.backdropFilterCard.light.trim() }
      : {}),
    ...(effects.backdropFilterCard.dark.trim()
      ? { dark: effects.backdropFilterCard.dark.trim() }
      : {}),
  };
  const cardGlow = {
    ...(effects.cardGlow.blue.trim()
      ? { blue: effects.cardGlow.blue.trim() }
      : {}),
    ...(effects.cardGlow.green.trim()
      ? { green: effects.cardGlow.green.trim() }
      : {}),
    ...(effects.cardGlow.red.trim()
      ? { red: effects.cardGlow.red.trim() }
      : {}),
    ...(effects.cardGlow.gold.trim()
      ? { gold: effects.cardGlow.gold.trim() }
      : {}),
    ...(effects.cardGlow.neutral.trim()
      ? { neutral: effects.cardGlow.neutral.trim() }
      : {}),
    ...(effects.cardGlow.success.trim()
      ? { success: effects.cardGlow.success.trim() }
      : {}),
    ...(effects.cardGlow.danger.trim()
      ? { danger: effects.cardGlow.danger.trim() }
      : {}),
    ...(effects.cardGlow.warning.trim()
      ? { warning: effects.cardGlow.warning.trim() }
      : {}),
  };

  const next = {
    ...(Object.keys(shadowCard).length > 0 ? { shadowCard } : {}),
    ...(Object.keys(gradientPrimary).length > 0 ? { gradientPrimary } : {}),
    ...(Object.keys(backgroundApp).length > 0 ? { backgroundApp } : {}),
    ...(Object.keys(gradientGlowBorder).length > 0
      ? { gradientGlowBorder }
      : {}),
    ...(Object.keys(shadowGlowBorder).length > 0 ? { shadowGlowBorder } : {}),
    ...(Object.keys(backdropFilterCard).length > 0
      ? { backdropFilterCard }
      : {}),
    ...(Object.keys(cardGlow).length > 0 ? { cardGlow } : {}),
  };

  return Object.keys(next).length > 0 ? next : undefined;
}

function buildChartColorsForSave(
  chartColors: ChartColorsState,
): TenantChartColors | undefined {
  const next = {
    ...(chartColors.chart1.trim() ? { chart1: chartColors.chart1.trim() } : {}),
    ...(chartColors.chart2.trim() ? { chart2: chartColors.chart2.trim() } : {}),
    ...(chartColors.chart3.trim() ? { chart3: chartColors.chart3.trim() } : {}),
    ...(chartColors.chart4.trim() ? { chart4: chartColors.chart4.trim() } : {}),
    ...(chartColors.glow1.trim() ? { glow1: chartColors.glow1.trim() } : {}),
    ...(chartColors.glow2.trim() ? { glow2: chartColors.glow2.trim() } : {}),
    ...(chartColors.glow3.trim() ? { glow3: chartColors.glow3.trim() } : {}),
    ...(chartColors.glow4.trim() ? { glow4: chartColors.glow4.trim() } : {}),
  };
  return Object.keys(next).length > 0 ? next : undefined;
}

function buildCustomTokensForSave(
  customTokens: readonly CustomTokenRowState[],
): TenantAppearance["customTokens"] {
  const tokens = customTokens
    .filter((row) => row.name.trim())
    .map((row) => ({
      kind: row.kind,
      name: row.name.trim(),
      ...(row.label.trim() ? { label: row.label.trim() } : {}),
      ...(row.light.trim() ? { light: row.light.trim() } : {}),
      ...(row.dark.trim() ? { dark: row.dark.trim() } : {}),
    }));

  const sanitized = sanitizeCustomTokens(tokens);
  return sanitized.length > 0 ? sanitized : undefined;
}

function buildSpacingScaleForSave(
  spacingScale: SpacingScaleState,
): TenantSpacingScale | undefined {
  const next = {
    ...(spacingScale.xs.trim() ? { xs: spacingScale.xs.trim() } : {}),
    ...(spacingScale.sm.trim() ? { sm: spacingScale.sm.trim() } : {}),
    ...(spacingScale.md.trim() ? { md: spacingScale.md.trim() } : {}),
    ...(spacingScale.base.trim() ? { base: spacingScale.base.trim() } : {}),
    ...(spacingScale.lg.trim() ? { lg: spacingScale.lg.trim() } : {}),
  };
  return Object.keys(next).length > 0 ? next : undefined;
}

function toSemanticColorInputValue(hex: string): string {
  try {
    return normalizeHexColor(hex);
  } catch {
    return "#000000";
  }
}

interface SemanticColorFieldProps {
  readonly cssVar: string;
  readonly value: string;
  readonly placeholder: string;
  readonly resolvedHint?: string;
  readonly onChange: (value: string) => void;
}

function SemanticColorField({
  cssVar,
  value,
  placeholder,
  resolvedHint,
  onChange,
}: SemanticColorFieldProps) {
  const colorPickerValue = value.trim()
    ? toSemanticColorInputValue(value)
    : "#000000";

  const colorInputId = `${cssVar}-picker`;
  const textInputId = `${cssVar}-hex`;

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={textInputId}>{cssVar}</FieldLabel>
      {resolvedHint && !value.trim() ? (
        <Text className="text-muted-foreground text-xs">{resolvedHint}</Text>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          id={colorInputId}
          type="color"
          aria-label={`${cssVar} picker`}
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={colorPickerValue}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          id={textInputId}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (!next) {
              return;
            }
            try {
              onChange(normalizeHexColor(next));
            } catch {
              // Keep partial input until valid hex.
            }
          }}
        />
      </div>
    </div>
  );
}

interface SchemeToggleProps {
  readonly value: EditorColorScheme;
  readonly onChange: (value: EditorColorScheme) => void;
  readonly lightLabel: string;
  readonly darkLabel: string;
}

function SchemeToggle({
  value,
  onChange,
  lightLabel,
  darkLabel,
}: SchemeToggleProps) {
  return (
    <div className="flex gap-2">
      {(["light", "dark"] as const).map((scheme) => (
        <Button
          key={scheme}
          type="button"
          size="sm"
          variant={value === scheme ? "primary" : "outline"}
          onClick={() => onChange(scheme)}
        >
          {scheme === "light" ? lightLabel : darkLabel}
        </Button>
      ))}
    </div>
  );
}

function resolveLoadedPalettes(appearance: TenantAppearanceLike | undefined): {
  primary: ColorPaletteConfig | undefined;
  neutral: ColorPaletteConfig | undefined;
} {
  return {
    primary:
      appearance?.palettes?.primary ??
      inferPaletteFromLegacyColors("primary", appearance?.colors),
    neutral:
      appearance?.palettes?.neutral ??
      inferPaletteFromLegacyColors("neutral", appearance?.colors),
  };
}

export function TenantAppearanceEditor({
  tenantId,
}: TenantAppearanceEditorProps) {
  const { t } = useTranslation("common");
  const { colorScheme } = useColorScheme();
  const { selectTenant } = useAuth();
  const themeJsonLabels = useMemo(() => tenantThemeJsonLabels(t), [t]);
  const triggerLabels = useJsonActionTriggerLabels();
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [primaryPalette, setPrimaryPalette] = useState<
    ColorPaletteConfig | undefined
  >();
  const [neutralPalette, setNeutralPalette] = useState<
    ColorPaletteConfig | undefined
  >();
  const [primaryTouched, setPrimaryTouched] = useState(false);
  const [neutralTouched, setNeutralTouched] = useState(false);
  const [semanticsByScheme, setSemanticsByScheme] =
    useState<SemanticsBySchemeState>({ light: {}, dark: {} });
  const [colorsByScheme, setColorsByScheme] = useState<ColorsBySchemeState>({
    light: {},
    dark: {},
  });
  const [effects, setEffects] = useState<EffectsState>(EMPTY_EFFECTS);
  const [chartColors, setChartColors] =
    useState<ChartColorsState>(EMPTY_CHART_COLORS);
  const [customTokens, setCustomTokens] = useState<CustomTokenRowState[]>([]);
  const [fontFamily, setFontFamily] = useState("");
  const [bodySize, setBodySize] = useState("");
  const [headingSize, setHeadingSize] = useState("");
  const [radius, setRadius] = useState("");
  const [radiusSm, setRadiusSm] = useState("");
  const [spacingScale, setSpacingScale] =
    useState<SpacingScaleState>(EMPTY_SPACING_SCALE);
  const [preset, setPreset] = useState<AppearancePreset>("default");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editorScheme, setEditorScheme] = useState<EditorColorScheme>("light");
  const [previewScheme, setPreviewScheme] =
    useState<EditorColorScheme>("light");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const buildDraftAppearance = useCallback((): TenantAppearance => {
    const palettes =
      primaryTouched || neutralTouched
        ? {
            ...(primaryTouched && primaryPalette
              ? { primary: primaryPalette }
              : {}),
            ...(neutralTouched && neutralPalette
              ? { neutral: neutralPalette }
              : {}),
          }
        : undefined;

    return {
      logoUrl: logoPreview ?? undefined,
      preset: preset === "default" ? undefined : preset,
      palettes,
      semanticsByScheme: pruneSchemeRecord(semanticsByScheme),
      colorsByScheme: pruneSchemeRecord(colorsByScheme),
      effects: buildEffectsForSave(effects),
      chartColors: buildChartColorsForSave(chartColors),
      customTokens: buildCustomTokensForSave(customTokens),
      fontFamily: fontFamily.trim() || undefined,
      fontSizes: {
        body: bodySize.trim() || undefined,
        heading: headingSize.trim() || undefined,
      },
      radius: radius.trim() || undefined,
      radiusSm: radiusSm.trim() || undefined,
      spacingScale: buildSpacingScaleForSave(spacingScale),
    };
  }, [
    bodySize,
    chartColors,
    colorsByScheme,
    customTokens,
    effects,
    fontFamily,
    headingSize,
    logoPreview,
    neutralPalette,
    neutralTouched,
    preset,
    primaryPalette,
    primaryTouched,
    radius,
    radiusSm,
    semanticsByScheme,
    spacingScale,
  ]);

  const draftAppearance = useMemo(
    () => buildDraftAppearance(),
    [buildDraftAppearance],
  );

  const paletteResolvedVars = useMemo(
    () =>
      appearanceToCssVariables(
        {
          preset: preset === "default" ? undefined : preset,
          palettes: draftAppearance.palettes,
        },
        { colorScheme: editorScheme },
      ),
    [draftAppearance.palettes, editorScheme, preset],
  );

  const savedPreviewVars = useMemo(
    () => appearanceToCssVariables(tenant?.appearance ?? {}, { colorScheme }),
    [colorScheme, tenant?.appearance],
  );

  const draftPreviewVars = useMemo(
    () =>
      appearanceToCssVariables(draftAppearance, { colorScheme: previewScheme }),
    [draftAppearance, previewScheme],
  );

  const applyAppearance = useCallback(
    (appearance: TenantAppearance | undefined) => {
      const palettes = resolveLoadedPalettes(appearance);
      setPrimaryPalette(palettes.primary);
      setNeutralPalette(palettes.neutral);
      setPrimaryTouched(Boolean(appearance?.palettes?.primary));
      setNeutralTouched(Boolean(appearance?.palettes?.neutral));
      setSemanticsByScheme(loadSemanticsByScheme(appearance));
      setColorsByScheme(loadColorsByScheme(appearance));
      setEffects(loadEffects(appearance));
      setChartColors(loadChartColors(appearance));
      setCustomTokens(loadCustomTokens(appearance));
      setFontFamily(appearance?.fontFamily ?? "");
      setBodySize(appearance?.fontSizes?.body ?? "");
      setHeadingSize(appearance?.fontSizes?.heading ?? "");
      setRadius(appearance?.radius ?? "");
      setRadiusSm(appearance?.radiusSm ?? "");
      setSpacingScale(loadSpacingScale(appearance));
      setPreset(normalizeAppearancePreset(appearance?.preset));
      setLogoPreview(appearance?.logoUrl ?? null);
    },
    [],
  );

  const applyImportedAppearance = useCallback(
    (appearance: TenantAppearance) => {
      applyAppearance(appearance);
      toast.success(t("platform.appearance.themeJson.importApplied"));
    },
    [applyAppearance, t],
  );

  function handlePresetChange(nextPreset: AppearancePreset) {
    setPreset(nextPreset);
    if (nextPreset === "default") {
      return;
    }

    const merged = applyAppearancePreset({ preset: nextPreset });
    const palettes = resolveLoadedPalettes(merged);
    if (palettes.primary) {
      setPrimaryPalette(palettes.primary);
      setPrimaryTouched(true);
    }
    if (palettes.neutral) {
      setNeutralPalette(palettes.neutral);
      setNeutralTouched(true);
    }
  }

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextTenant = await getAdminTenant(tenantId);
      setTenant(nextTenant);
      applyAppearance(nextTenant.appearance);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("platform.appearance.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyAppearance, t, tenantId]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  async function handleLogoUpload(params: {
    readonly file: File;
    readonly uploadId: string;
  }) {
    setIsSaving(true);
    try {
      const data = await readFileAsBase64(params.file);
      const result = await uploadTenantLogo(tenantId, {
        contentType: params.file.type || "image/jpeg",
        data,
      });
      setLogoPreview(result.logoUrl);
      setTenant(result.tenant);
      toast.success(t("platform.appearance.logoSuccess"));
      await selectTenant(tenantId);
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : t("platform.appearance.saveFailed"),
      );
      throw uploadError;
    } finally {
      setIsSaving(false);
    }
  }

  function updateSchemeSemantics(
    scheme: EditorColorScheme,
    cssVar: string,
    value: string,
  ) {
    setSemanticsByScheme((current) => ({
      ...current,
      [scheme]: {
        ...current[scheme],
        [cssVar]: value,
      },
    }));
  }

  function updateSchemeSidebarColor(
    scheme: EditorColorScheme,
    cssVar: string,
    value: string,
  ) {
    setColorsByScheme((current) => ({
      ...current,
      [scheme]: {
        ...current[scheme],
        [cssVar]: value,
      },
    }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const appearance = buildDraftAppearance();
      const updated = await updateAdminTenant(tenantId, { appearance });
      setTenant(updated);
      applyAppearance(updated.appearance);
      toast.success(t("platform.appearance.saveSuccess"));
      await selectTenant(tenantId);
      setFormOpen(false);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t("platform.appearance.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    try {
      const updated = await updateAdminTenant(tenantId, { appearance: null });
      setTenant(updated);
      applyAppearance(undefined);
      toast.success(t("platform.appearance.resetSuccess"));
      await selectTenant(tenantId);
    } catch (resetError) {
      toast.error(
        resetError instanceof Error
          ? resetError.message
          : t("platform.appearance.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const effectFieldLabels = {
    shadowCard: t("platform.appearance.effectsFields.shadowCard"),
    gradientPrimary: t("platform.appearance.effectsFields.gradientPrimary"),
    backgroundApp: t("platform.appearance.effectsFields.backgroundApp"),
    gradientGlowBorder: t(
      "platform.appearance.effectsFields.gradientGlowBorder",
    ),
    shadowGlowBorder: t("platform.appearance.effectsFields.shadowGlowBorder"),
    backdropFilterCard: t(
      "platform.appearance.effectsFields.backdropFilterCard",
    ),
  } as const;

  const cardGlowLegacyFieldLabels: Record<
    (typeof CARD_GLOW_LEGACY_KEYS)[number],
    string
  > = {
    blue: t("platform.appearance.effectsFields.cardGlowBlue"),
    green: t("platform.appearance.effectsFields.cardGlowGreen"),
    red: t("platform.appearance.effectsFields.cardGlowRed"),
    gold: t("platform.appearance.effectsFields.cardGlowGold"),
  };

  const cardGlowSemanticFieldLabels: Record<
    (typeof CARD_GLOW_SEMANTIC_KEYS)[number],
    string
  > = {
    neutral: t("platform.appearance.effectsFields.cardGlowNeutral"),
    success: t("platform.appearance.effectsFields.cardGlowSuccess"),
    danger: t("platform.appearance.effectsFields.cardGlowDanger"),
    warning: t("platform.appearance.effectsFields.cardGlowWarning"),
  };

  if (isLoading) {
    return <SettingsPanelSkeleton variant="appearance" />;
  }

  if (!tenant) {
    return <Alert>{t("platform.currentTenant.notFound")}</Alert>;
  }

  const savedPreset = normalizeAppearancePreset(tenant.appearance?.preset);
  const presetLabel =
    savedPreset === "default"
      ? t("platform.appearance.presetDefault")
      : t(`platform.appearance.presets.${savedPreset}` as never);

  const activeSemantics = semanticsByScheme[editorScheme];
  const activeSidebarColors = colorsByScheme[editorScheme];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => setFormOpen(true)}>
          {t("platform.appearance.customize")}
        </Button>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-2">
        <dl className="grid gap-2">
          <div>
            <dt className="text-muted-foreground font-medium">
              {t("platform.appearance.logo")}
            </dt>
            <dd>
              {tenant.appearance?.logoUrl ? (
                <img
                  src={tenant.appearance.logoUrl}
                  alt={t("platform.appearance.logoPreview")}
                  className="mt-1 h-12 w-auto max-w-full object-contain"
                />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">
              {t("platform.appearance.preset")}
            </dt>
            <dd>{presetLabel}</dd>
          </div>
        </dl>

        <div
          className="border-border rounded-lg border p-6"
          style={savedPreviewVars as CSSProperties}
        >
          <Text className="font-medium">
            {t("platform.appearance.preview")}
          </Text>
          <div className="bg-card text-card-foreground mt-4 space-y-2 rounded-lg border p-4 shadow-card">
            <Text className="text-heading font-semibold">{tenant.name}</Text>
            <Text className="text-body">
              {t("platform.appearance.previewBody")}
            </Text>
            <Button type="button">
              {t("platform.appearance.previewButton")}
            </Button>
          </div>
        </div>
      </div>

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={t("platform.appearance.customize")}
        size="xl"
      >
        <div className="flex flex-col gap-6 xl:flex-row">
          <Form
            className="grid min-w-0 flex-1 gap-6"
            onSubmit={(event) => void handleSave(event)}
          >
            <div className="flex flex-wrap gap-2">
              <JsonViewTriggerButton
                labels={triggerLabels}
                onClick={() => setViewDialogOpen(true)}
              />
              <JsonImportTriggerButton
                labels={triggerLabels}
                onClick={() => setImportDialogOpen(true)}
              />
            </div>

            <section className="grid gap-3">
              <Text className="font-medium">
                {t("platform.appearance.logo")}
              </Text>
              <PhotoUpload
                value={logoPreview}
                alt={t("platform.appearance.logoPreview")}
                cropShape="rect"
                allowOriginalUpload={false}
                uploading={isSaving}
                disabled={isSaving}
                labels={{
                  select: t("platform.appearance.photoSelect"),
                  change: t("platform.appearance.photoChange"),
                  cropTitle: t("platform.appearance.photoCropTitle"),
                  cropDescription: t(
                    "platform.appearance.photoCropDescription",
                  ),
                  upload: t("platform.appearance.photoUpload"),
                  uploadCropped: t("platform.appearance.photoUploadCropped"),
                  cancel: t("platform.appearance.photoCancel"),
                  reset: t("platform.appearance.photoReset"),
                  expand: t("platform.appearance.photoExpand"),
                  cropFrameSquare: t(
                    "platform.appearance.photoCropFrameSquare",
                  ),
                  cropFrameLandscape43: t(
                    "platform.appearance.photoCropFrame43",
                  ),
                  cropFrameLandscape169: t(
                    "platform.appearance.photoCropFrame169",
                  ),
                  cropMaskCircle: t("platform.appearance.photoCropMaskCircle"),
                  cropMaskRect: t("platform.appearance.photoCropMaskRect"),
                  cropFrameAriaLabel: t(
                    "platform.appearance.photoCropFrameAriaLabel",
                  ),
                  cropMaskAriaLabel: t(
                    "platform.appearance.photoCropMaskAriaLabel",
                  ),
                }}
                onUpload={handleLogoUpload}
                onError={(message) => toast.error(message)}
              />
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <Text className="font-medium">
                {t("platform.appearance.preset")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.presetHint")}
              </Text>
              <div className="flex max-w-md flex-col gap-1">
                <FieldLabel htmlFor="appearance-preset">
                  {t("platform.appearance.preset")}
                </FieldLabel>
                <Select
                  id="appearance-preset"
                  className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm shadow-sm"
                  value={preset}
                  onChange={(event) =>
                    handlePresetChange(event.target.value as AppearancePreset)
                  }
                >
                  <option value="default">
                    {t("platform.appearance.presetDefault")}
                  </option>
                  {SELECTABLE_THEME_PRESETS.map((presetId) => (
                    <option key={presetId} value={presetId}>
                      {t(`platform.appearance.presets.${presetId}` as never)}
                    </option>
                  ))}
                </Select>
              </div>
            </section>

            <ColorPaletteEditor
              kind="primary"
              value={primaryPalette}
              onChange={(value) => {
                setPrimaryPalette(value);
                setPrimaryTouched(true);
              }}
            />

            <ColorPaletteEditor
              kind="neutral"
              value={neutralPalette}
              onChange={(value) => {
                setNeutralPalette(value);
                setNeutralTouched(true);
              }}
            />

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Text className="font-medium">
                  {t("platform.appearance.semantics")}
                </Text>
                <SchemeToggle
                  value={editorScheme}
                  onChange={setEditorScheme}
                  lightLabel={t("platform.appearance.schemeLight")}
                  darkLabel={t("platform.appearance.schemeDark")}
                />
              </div>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.semanticsHint")}
              </Text>
              {TENANT_OVERRIDE_GROUPS.semantics.map((cssVar) => (
                <SemanticColorField
                  key={`${editorScheme}-${cssVar}`}
                  cssVar={cssVar}
                  value={activeSemantics[cssVar] ?? ""}
                  placeholder={t("platform.appearance.placeholder")}
                  resolvedHint={
                    paletteResolvedVars[cssVar]
                      ? t("platform.appearance.resolvedDefault", {
                          value: paletteResolvedVars[cssVar],
                        })
                      : undefined
                  }
                  onChange={(nextValue) =>
                    updateSchemeSemantics(editorScheme, cssVar, nextValue)
                  }
                />
              ))}
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Text className="font-medium">
                  {t("platform.appearance.badgeSemantics")}
                </Text>
                <SchemeToggle
                  value={editorScheme}
                  onChange={setEditorScheme}
                  lightLabel={t("platform.appearance.schemeLight")}
                  darkLabel={t("platform.appearance.schemeDark")}
                />
              </div>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.badgeSemanticsHint")}
              </Text>
              {TENANT_OVERRIDE_GROUPS.badge.map((cssVar) => (
                <SemanticColorField
                  key={`${editorScheme}-${cssVar}`}
                  cssVar={cssVar}
                  value={activeSemantics[cssVar] ?? ""}
                  placeholder={t("platform.appearance.placeholder")}
                  resolvedHint={
                    paletteResolvedVars[cssVar]
                      ? t("platform.appearance.resolvedDefault", {
                          value: paletteResolvedVars[cssVar],
                        })
                      : undefined
                  }
                  onChange={(nextValue) =>
                    updateSchemeSemantics(editorScheme, cssVar, nextValue)
                  }
                />
              ))}
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Text className="font-medium">
                  {t("platform.appearance.groups.sidebar")}
                </Text>
                <SchemeToggle
                  value={editorScheme}
                  onChange={setEditorScheme}
                  lightLabel={t("platform.appearance.schemeLight")}
                  darkLabel={t("platform.appearance.schemeDark")}
                />
              </div>
              {TENANT_OVERRIDE_GROUPS.sidebar.map((cssVar) => (
                <div
                  key={`${editorScheme}-${cssVar}`}
                  className="flex flex-col gap-1"
                >
                  <FieldLabel htmlFor={`${editorScheme}-${cssVar}`}>
                    {cssVar}
                  </FieldLabel>
                  <Input
                    id={`${editorScheme}-${cssVar}`}
                    value={activeSidebarColors[cssVar] ?? ""}
                    placeholder={
                      paletteResolvedVars[cssVar] ??
                      t("platform.appearance.placeholder")
                    }
                    onChange={(event) =>
                      updateSchemeSidebarColor(
                        editorScheme,
                        cssVar,
                        event.target.value,
                      )
                    }
                  />
                </div>
              ))}
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <Text className="font-medium">
                {t("platform.appearance.effects")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.effectsHint")}
              </Text>
              {(
                [
                  "shadowCard",
                  "gradientPrimary",
                  "backgroundApp",
                  "gradientGlowBorder",
                  "shadowGlowBorder",
                  "backdropFilterCard",
                ] as const
              ).map((effectKey) => (
                <div key={effectKey} className="grid gap-2">
                  <Text className="text-sm font-medium">
                    {effectFieldLabels[effectKey]}
                  </Text>
                  {(["light", "dark"] as const).map((scheme) => (
                    <div
                      key={`${effectKey}-${scheme}`}
                      className="flex flex-col gap-1"
                    >
                      <FieldLabel htmlFor={`${effectKey}-${scheme}`}>
                        {scheme === "light"
                          ? t("platform.appearance.schemeLight")
                          : t("platform.appearance.schemeDark")}
                      </FieldLabel>
                      <Input
                        id={`${effectKey}-${scheme}`}
                        value={effects[effectKey][scheme]}
                        placeholder={t("platform.appearance.placeholder")}
                        onChange={(event) =>
                          setEffects((current) => ({
                            ...current,
                            [effectKey]: {
                              ...current[effectKey],
                              [scheme]: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
              <div className="grid gap-2">
                <Text className="text-sm font-medium">
                  {t("platform.appearance.effectsFields.cardGlowLegacy")}
                </Text>
                {CARD_GLOW_LEGACY_KEYS.map((glowKey) => (
                  <div key={glowKey} className="flex flex-col gap-1">
                    <FieldLabel htmlFor={`cardGlow-${glowKey}`}>
                      {cardGlowLegacyFieldLabels[glowKey]}
                    </FieldLabel>
                    <Input
                      id={`cardGlow-${glowKey}`}
                      value={effects.cardGlow[glowKey]}
                      placeholder={t("platform.appearance.placeholder")}
                      onChange={(event) =>
                        setEffects((current) => ({
                          ...current,
                          cardGlow: {
                            ...current.cardGlow,
                            [glowKey]: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <Text className="text-sm font-medium">
                  {t("platform.appearance.effectsFields.cardGlowSemantic")}
                </Text>
                {CARD_GLOW_SEMANTIC_KEYS.map((glowKey) => (
                  <div key={glowKey} className="flex flex-col gap-1">
                    <FieldLabel htmlFor={`cardGlow-${glowKey}`}>
                      {cardGlowSemanticFieldLabels[glowKey]}
                    </FieldLabel>
                    <Input
                      id={`cardGlow-${glowKey}`}
                      value={effects.cardGlow[glowKey]}
                      placeholder={t("platform.appearance.placeholder")}
                      onChange={(event) =>
                        setEffects((current) => ({
                          ...current,
                          cardGlow: {
                            ...current.cardGlow,
                            [glowKey]: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <Text className="font-medium">
                {t("platform.appearance.chartColors")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.chartColorsHint")}
              </Text>
              {CHART_COLOR_KEYS.map(({ key, cssVar }) => (
                <SemanticColorField
                  key={key}
                  cssVar={cssVar}
                  value={chartColors[key]}
                  placeholder={t("platform.appearance.placeholder")}
                  onChange={(nextValue) =>
                    setChartColors((current) => ({
                      ...current,
                      [key]: nextValue,
                    }))
                  }
                />
              ))}
              <Text className="pt-2 text-sm font-medium">
                {t("platform.appearance.chartGlowColors")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.chartGlowColorsHint")}
              </Text>
              {CHART_GLOW_COLOR_KEYS.map(({ key, cssVar }) => (
                <SemanticColorField
                  key={key}
                  cssVar={cssVar}
                  value={chartColors[key]}
                  placeholder={t("platform.appearance.placeholder")}
                  onChange={(nextValue) =>
                    setChartColors((current) => ({
                      ...current,
                      [key]: nextValue,
                    }))
                  }
                />
              ))}
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text className="font-medium">
                  {t("platform.appearance.customTokens")}
                </Text>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={customTokens.length >= MAX_CUSTOM_TOKENS}
                  onClick={() =>
                    setCustomTokens((current) => [
                      ...current,
                      createCustomTokenRow(),
                    ])
                  }
                >
                  {t("platform.appearance.customTokensAdd")}
                </Button>
              </div>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.customTokensHint")}
              </Text>
              {customTokens.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {t("platform.appearance.customTokensEmpty")}
                </Text>
              ) : (
                customTokens.map((row, index) => {
                  const resolvedVar = row.name.trim()
                    ? resolveCustomTokenCssVar({
                        kind: row.kind,
                        name: row.name.trim(),
                      })
                    : null;

                  return (
                    <div
                      key={row.id}
                      className="border-border grid gap-3 rounded-md border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Text className="text-sm font-medium">
                          {t("platform.appearance.customTokensRow", {
                            index: index + 1,
                          })}
                        </Text>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setCustomTokens((current) =>
                              current.filter((entry) => entry.id !== row.id),
                            )
                          }
                        >
                          {t("platform.appearance.customTokensRemove")}
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <FieldLabel htmlFor={`custom-token-kind-${row.id}`}>
                            {t("platform.appearance.customTokensKind")}
                          </FieldLabel>
                          <Select
                            id={`custom-token-kind-${row.id}`}
                            value={row.kind}
                            onChange={(event) =>
                              setCustomTokens((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? {
                                        ...entry,
                                        kind: event.target
                                          .value as TenantCustomTokenKind,
                                      }
                                    : entry,
                                ),
                              )
                            }
                          >
                            <option value="color">
                              {t("platform.appearance.customTokensKindColor")}
                            </option>
                            <option value="gradient">
                              {t(
                                "platform.appearance.customTokensKindGradient",
                              )}
                            </option>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <FieldLabel htmlFor={`custom-token-name-${row.id}`}>
                            {t("platform.appearance.customTokensName")}
                          </FieldLabel>
                          <Input
                            id={`custom-token-name-${row.id}`}
                            value={row.name}
                            placeholder={t(
                              "platform.appearance.customTokensNamePlaceholder",
                            )}
                            onChange={(event) =>
                              setCustomTokens((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, name: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <FieldLabel htmlFor={`custom-token-label-${row.id}`}>
                            {t("platform.appearance.customTokensLabel")}
                          </FieldLabel>
                          <Input
                            id={`custom-token-label-${row.id}`}
                            value={row.label}
                            placeholder={t("platform.appearance.placeholder")}
                            onChange={(event) =>
                              setCustomTokens((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, label: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <FieldLabel htmlFor={`custom-token-light-${row.id}`}>
                            {t("platform.appearance.schemeLight")}
                          </FieldLabel>
                          <Input
                            id={`custom-token-light-${row.id}`}
                            value={row.light}
                            placeholder={t("platform.appearance.placeholder")}
                            onChange={(event) =>
                              setCustomTokens((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, light: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <FieldLabel htmlFor={`custom-token-dark-${row.id}`}>
                            {t("platform.appearance.schemeDark")}
                          </FieldLabel>
                          <Input
                            id={`custom-token-dark-${row.id}`}
                            value={row.dark}
                            placeholder={t("platform.appearance.placeholder")}
                            onChange={(event) =>
                              setCustomTokens((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, dark: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                      {resolvedVar ? (
                        <Text variant="muted" className="text-xs">
                          {t("platform.appearance.customTokensResolvedVar", {
                            name: resolvedVar,
                          })}
                        </Text>
                      ) : null}
                    </div>
                  );
                })
              )}
            </section>

            <section className="grid gap-3">
              <Text className="font-medium">
                {t("platform.appearance.typography")}
              </Text>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="font-family">
                  {t("platform.appearance.fontFamily")}
                </FieldLabel>
                <Input
                  id="font-family"
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="body-size">
                  {t("platform.appearance.bodySize")}
                </FieldLabel>
                <Input
                  id="body-size"
                  value={bodySize}
                  onChange={(event) => setBodySize(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="heading-size">
                  {t("platform.appearance.headingSize")}
                </FieldLabel>
                <Input
                  id="heading-size"
                  value={headingSize}
                  onChange={(event) => setHeadingSize(event.target.value)}
                />
              </div>
            </section>

            <section className="grid gap-3">
              <Text className="font-medium">
                {t("platform.appearance.layout")}
              </Text>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="radius-lg">
                  {t("platform.appearance.radiusLg")}
                </FieldLabel>
                <Input
                  id="radius-lg"
                  value={radius}
                  onChange={(event) => setRadius(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="radius-sm">
                  {t("platform.appearance.radiusSm")}
                </FieldLabel>
                <Input
                  id="radius-sm"
                  value={radiusSm}
                  onChange={(event) => setRadiusSm(event.target.value)}
                />
              </div>
              <Text variant="muted" className="text-sm">
                {t("platform.appearance.spacingHint")}
              </Text>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="spacing-xs">
                    {t("platform.appearance.spacingXs")}
                  </FieldLabel>
                  <Input
                    id="spacing-xs"
                    value={spacingScale.xs}
                    placeholder={t("platform.appearance.placeholder")}
                    onChange={(event) =>
                      setSpacingScale((current) => ({
                        ...current,
                        xs: event.target.value,
                      }))
                    }
                  />
                  <Text variant="muted" className="text-xs">
                    {t("platform.appearance.spacingXsHint")}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="spacing-sm">
                    {t("platform.appearance.spacingSm")}
                  </FieldLabel>
                  <Input
                    id="spacing-sm"
                    value={spacingScale.sm}
                    placeholder={t("platform.appearance.placeholder")}
                    onChange={(event) =>
                      setSpacingScale((current) => ({
                        ...current,
                        sm: event.target.value,
                      }))
                    }
                  />
                  <Text variant="muted" className="text-xs">
                    {t("platform.appearance.spacingSmHint")}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="spacing-md">
                    {t("platform.appearance.spacingMd")}
                  </FieldLabel>
                  <Input
                    id="spacing-md"
                    value={spacingScale.md}
                    placeholder={t("platform.appearance.placeholder")}
                    onChange={(event) =>
                      setSpacingScale((current) => ({
                        ...current,
                        md: event.target.value,
                      }))
                    }
                  />
                  <Text variant="muted" className="text-xs">
                    {t("platform.appearance.spacingMdHint")}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="spacing-base">
                    {t("platform.appearance.spacingBase")}
                  </FieldLabel>
                  <Input
                    id="spacing-base"
                    value={spacingScale.base}
                    placeholder={t("platform.appearance.placeholder")}
                    onChange={(event) =>
                      setSpacingScale((current) => ({
                        ...current,
                        base: event.target.value,
                      }))
                    }
                  />
                  <Text variant="muted" className="text-xs">
                    {t("platform.appearance.spacingBaseHint")}
                  </Text>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <FieldLabel htmlFor="spacing-lg">
                    {t("platform.appearance.spacingLg")}
                  </FieldLabel>
                  <Input
                    id="spacing-lg"
                    value={spacingScale.lg}
                    placeholder={t("platform.appearance.placeholder")}
                    onChange={(event) =>
                      setSpacingScale((current) => ({
                        ...current,
                        lg: event.target.value,
                      }))
                    }
                  />
                  <Text variant="muted" className="text-xs">
                    {t("platform.appearance.spacingLgHint")}
                  </Text>
                </div>
              </div>
            </section>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("loading") : t("platform.appearance.save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={() => void handleReset()}
              >
                {t("platform.appearance.reset")}
              </Button>
            </div>
          </Form>

          <div
            className="border-border min-w-0 flex-1 rounded-lg border p-6"
            style={draftPreviewVars as CSSProperties}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Text className="font-medium">
                {t("platform.appearance.preview")}
              </Text>
              <SchemeToggle
                value={previewScheme}
                onChange={setPreviewScheme}
                lightLabel={t("platform.appearance.schemeLight")}
                darkLabel={t("platform.appearance.schemeDark")}
              />
            </div>

            <div className="grid gap-4">
              <div className="bg-card text-card-foreground space-y-2 rounded-lg border p-4 shadow-card">
                <Text className="text-heading font-semibold">
                  {tenant.name}
                </Text>
                <Text className="text-body">
                  {t("platform.appearance.previewBody")}
                </Text>
                <Button type="button">
                  {t("platform.appearance.previewButton")}
                </Button>
              </div>

              <div
                className="space-y-2 rounded-lg p-4 text-primary-foreground shadow-card"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Text className="text-sm font-medium opacity-90">
                  {t("platform.appearance.previewGradientLabel")}
                </Text>
                <Text className="text-heading font-semibold">$24,500.00</Text>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="bg-badge-success text-badge-success-foreground rounded-sm px-2 py-1 text-xs font-medium">
                  {t("platform.appearance.previewBadgeSuccess")}
                </span>
                <span className="bg-badge-warning text-badge-warning-foreground rounded-sm px-2 py-1 text-xs font-medium">
                  {t("platform.appearance.previewBadgeWarning")}
                </span>
                <span className="bg-badge-info text-badge-info-foreground rounded-sm px-2 py-1 text-xs font-medium">
                  {t("platform.appearance.previewBadgeInfo")}
                </span>
              </div>

              <div className="bg-sidebar text-sidebar-foreground rounded-lg border border-sidebar-border p-3">
                <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded-sm px-3 py-2 text-sm font-medium">
                  {t("platform.appearance.previewSidebarActive")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      <TenantThemeJsonViewDialog
        appearance={draftAppearance}
        labels={themeJsonLabels}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
      <TenantThemeJsonImportDialog
        labels={themeJsonLabels}
        onApply={applyImportedAppearance}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}
