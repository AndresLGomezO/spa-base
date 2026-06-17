import {
  tenantAppearanceSchema,
  type TenantAppearance,
} from "@repo/shared-types";

import {
  BADGE_SEMANTIC_CSS_VARS,
  TENANT_OVERRIDE_GROUPS,
  TENANT_THEME_EXPORT_VERSION,
  sanitizeCustomTokens,
  type TenantAppearanceLike,
} from "./tenant-overrides.js";

const BADGE_CSS_VAR_SET = new Set<string>(BADGE_SEMANTIC_CSS_VARS);
const SIDEBAR_CSS_VAR_SET = new Set<string>(TENANT_OVERRIDE_GROUPS.sidebar);

export interface TenantThemeImportError {
  readonly path: string;
  readonly message: string;
}

export type TenantThemeImportValidationResult =
  | { readonly ok: true; readonly data: TenantAppearance }
  | { readonly ok: false; readonly errors: readonly TenantThemeImportError[] };

export interface TenantThemeExportDocument {
  readonly version: number;
  readonly palettes?: TenantAppearance["palettes"];
  readonly semantics?: {
    readonly light?: Record<string, string>;
    readonly dark?: Record<string, string>;
  };
  readonly sidebar?: {
    readonly light?: Record<string, string>;
    readonly dark?: Record<string, string>;
  };
  readonly badges?: {
    readonly light?: Record<string, string>;
    readonly dark?: Record<string, string>;
  };
  readonly effects?: TenantAppearance["effects"];
  readonly chartColors?: TenantAppearance["chartColors"];
  readonly customTokens?: TenantAppearance["customTokens"];
  readonly typography?: {
    readonly fontFamily?: string;
    readonly bodySize?: string;
    readonly headingSize?: string;
  };
  readonly layout?: {
    readonly radiusLg?: string;
    readonly radiusSm?: string;
    /** @deprecated Use spacingBase for macro layout spacing. */
    readonly spacing?: string;
    readonly spacingXs?: string;
    readonly spacingSm?: string;
    readonly spacingMd?: string;
    readonly spacingBase?: string;
    readonly spacingLg?: string;
    readonly sidebarWidth?: string;
  };
  readonly preset?: TenantAppearance["preset"];
  readonly logoUrl?: string;
}

function normalizeCssVarKey(key: string): string {
  return key.startsWith("--") ? key : `--${key}`;
}

function splitSemanticRecord(
  record: Readonly<Record<string, string>> | undefined,
): {
  semantics: Record<string, string>;
  badges: Record<string, string>;
} {
  const semantics: Record<string, string> = {};
  const badges: Record<string, string> = {};

  if (!record) {
    return { semantics, badges };
  }

  for (const [key, value] of Object.entries(record)) {
    const cssVar = normalizeCssVarKey(key);
    if (!value.trim()) {
      continue;
    }
    if (BADGE_CSS_VAR_SET.has(cssVar)) {
      badges[cssVar] = value.trim();
    } else {
      semantics[cssVar] = value.trim();
    }
  }

  return { semantics, badges };
}

function mergeSemanticSections(
  semantics: Record<string, string>,
  badges: Record<string, string>,
): Record<string, string> {
  return { ...semantics, ...badges };
}

function pickSidebarColors(
  record: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  if (!record) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record)
      .map(([key, value]) => [normalizeCssVarKey(key), value.trim()] as const)
      .filter(
        ([key, value]) => SIDEBAR_CSS_VAR_SET.has(key) && value.length > 0,
      ),
  );
}

function pruneRecord(
  record: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!record || Object.keys(record).length === 0) {
    return undefined;
  }
  return record;
}

function pruneSchemeSection(section: {
  light?: Record<string, string>;
  dark?: Record<string, string>;
}): TenantThemeExportDocument["semantics"] {
  const light = pruneRecord(section.light);
  const dark = pruneRecord(section.dark);
  if (!light && !dark) {
    return undefined;
  }
  return { ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
}

function pickLayoutSpacingScale(
  appearance: TenantAppearanceLike,
): TenantThemeExportDocument["layout"] {
  const scale = appearance.spacingScale ?? {};
  const base = scale.base?.trim() || appearance.spacing?.trim();

  return pruneRecord({
    ...(scale.xs?.trim() ? { spacingXs: scale.xs.trim() } : {}),
    ...(scale.sm?.trim() ? { spacingSm: scale.sm.trim() } : {}),
    ...(scale.md?.trim() ? { spacingMd: scale.md.trim() } : {}),
    ...(base ? { spacingBase: base } : {}),
    ...(scale.lg?.trim() ? { spacingLg: scale.lg.trim() } : {}),
  });
}

function buildSpacingScaleFromLayout(
  layout: TenantThemeExportDocument["layout"],
): TenantAppearance["spacingScale"] | undefined {
  if (!layout) {
    return undefined;
  }

  const scale = pruneRecord({
    ...(layout.spacingXs?.trim() ? { xs: layout.spacingXs.trim() } : {}),
    ...(layout.spacingSm?.trim() ? { sm: layout.spacingSm.trim() } : {}),
    ...(layout.spacingMd?.trim() ? { md: layout.spacingMd.trim() } : {}),
    ...(layout.spacingBase?.trim() || layout.spacing?.trim()
      ? { base: (layout.spacingBase ?? layout.spacing)?.trim() }
      : {}),
    ...(layout.spacingLg?.trim() ? { lg: layout.spacingLg.trim() } : {}),
  });

  return scale;
}

export function exportTenantTheme(appearance: TenantAppearance): string {
  const lightSemantics = splitSemanticRecord(
    appearance.semanticsByScheme?.light ?? appearance.semantics,
  );
  const darkSemantics = splitSemanticRecord(appearance.semanticsByScheme?.dark);
  const lightBadges = splitSemanticRecord(
    appearance.semanticsByScheme?.light,
  ).badges;
  const darkBadges = darkSemantics.badges;

  const document: TenantThemeExportDocument = {
    version: TENANT_THEME_EXPORT_VERSION,
    ...(appearance.preset ? { preset: appearance.preset } : {}),
    ...(appearance.logoUrl ? { logoUrl: appearance.logoUrl } : {}),
    ...(appearance.palettes ? { palettes: appearance.palettes } : {}),
    semantics: pruneSchemeSection({
      light: pruneRecord(mergeSemanticSections(lightSemantics.semantics, {})),
      dark: pruneRecord(mergeSemanticSections(darkSemantics.semantics, {})),
    }),
    badges: pruneSchemeSection({
      light: pruneRecord(
        mergeSemanticSections(
          {},
          Object.keys(lightBadges).length > 0
            ? lightBadges
            : lightSemantics.badges,
        ),
      ),
      dark: pruneRecord(darkBadges),
    }),
    sidebar: pruneSchemeSection({
      light: pruneRecord(
        pickSidebarColors(
          appearance.colorsByScheme?.light ?? appearance.colors,
        ),
      ),
      dark: pruneRecord(pickSidebarColors(appearance.colorsByScheme?.dark)),
    }),
    ...(appearance.effects ? { effects: appearance.effects } : {}),
    ...(appearance.chartColors ? { chartColors: appearance.chartColors } : {}),
    ...(appearance.customTokens?.length
      ? { customTokens: sanitizeCustomTokens(appearance.customTokens) }
      : {}),
    typography: {
      ...(appearance.fontFamily ? { fontFamily: appearance.fontFamily } : {}),
      ...(appearance.fontSizes?.body
        ? { bodySize: appearance.fontSizes.body }
        : {}),
      ...(appearance.fontSizes?.heading
        ? { headingSize: appearance.fontSizes.heading }
        : {}),
    },
    layout: {
      ...(appearance.radius ? { radiusLg: appearance.radius } : {}),
      ...(appearance.radiusSm ? { radiusSm: appearance.radiusSm } : {}),
      ...pickLayoutSpacingScale(appearance),
      ...(appearance.colors?.["--sidebar-width"] ||
      appearance.colorsByScheme?.light?.["--sidebar-width"] ||
      appearance.colorsByScheme?.dark?.["--sidebar-width"]
        ? {
            sidebarWidth:
              appearance.colorsByScheme?.light?.["--sidebar-width"] ??
              appearance.colorsByScheme?.dark?.["--sidebar-width"] ??
              appearance.colors?.["--sidebar-width"],
          }
        : {}),
    },
  };

  return `${JSON.stringify(document, null, 2)}\n`;
}

function mergeSchemeRecords(
  semantics?: TenantThemeExportDocument["semantics"],
  badges?: TenantThemeExportDocument["badges"],
): TenantAppearance["semanticsByScheme"] {
  const light = {
    ...(semantics?.light ?? {}),
    ...(badges?.light ?? {}),
  };
  const dark = {
    ...(semantics?.dark ?? {}),
    ...(badges?.dark ?? {}),
  };

  return {
    ...(Object.keys(light).length > 0 ? { light } : {}),
    ...(Object.keys(dark).length > 0 ? { dark } : {}),
  };
}

function buildAppearanceFromDocument(
  parsed: TenantThemeExportDocument,
): TenantAppearanceLike {
  const semanticsByScheme = mergeSchemeRecords(parsed.semantics, parsed.badges);
  const colorsByScheme = {
    ...(parsed.sidebar?.light ? { light: parsed.sidebar.light } : {}),
    ...(parsed.sidebar?.dark ? { dark: parsed.sidebar.dark } : {}),
  };

  if (parsed.layout?.sidebarWidth?.trim()) {
    colorsByScheme.light = {
      ...(colorsByScheme.light ?? {}),
      "--sidebar-width": parsed.layout.sidebarWidth.trim(),
    };
  }

  return {
    ...(parsed.logoUrl ? { logoUrl: parsed.logoUrl } : {}),
    ...(parsed.preset ? { preset: parsed.preset } : {}),
    ...(parsed.palettes ? { palettes: parsed.palettes } : {}),
    ...(Object.keys(semanticsByScheme ?? {}).length > 0
      ? { semanticsByScheme }
      : {}),
    ...(Object.keys(colorsByScheme).length > 0 ? { colorsByScheme } : {}),
    ...(parsed.effects ? { effects: parsed.effects } : {}),
    ...(parsed.chartColors ? { chartColors: parsed.chartColors } : {}),
    ...(parsed.customTokens?.length
      ? { customTokens: sanitizeCustomTokens(parsed.customTokens) }
      : {}),
    ...(parsed.typography?.fontFamily
      ? { fontFamily: parsed.typography.fontFamily }
      : {}),
    ...(parsed.typography?.bodySize || parsed.typography?.headingSize
      ? {
          fontSizes: {
            ...(parsed.typography.bodySize
              ? { body: parsed.typography.bodySize }
              : {}),
            ...(parsed.typography.headingSize
              ? { heading: parsed.typography.headingSize }
              : {}),
          },
        }
      : {}),
    ...(parsed.layout?.radiusLg ? { radius: parsed.layout.radiusLg } : {}),
    ...(parsed.layout?.radiusSm ? { radiusSm: parsed.layout.radiusSm } : {}),
    ...(buildSpacingScaleFromLayout(parsed.layout)
      ? { spacingScale: buildSpacingScaleFromLayout(parsed.layout) }
      : {}),
  };
}

function parseTenantThemeDocument(json: string): TenantThemeExportDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON syntax.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as TenantThemeExportDocument).version !== "number"
  ) {
    throw new Error("Invalid theme file: missing version.");
  }

  const document = parsed as TenantThemeExportDocument;

  if (document.version !== TENANT_THEME_EXPORT_VERSION) {
    throw new Error(
      `Unsupported theme version ${String(document.version)}. Expected ${TENANT_THEME_EXPORT_VERSION}.`,
    );
  }

  return document;
}

export function createTenantThemeSkeleton(): string {
  const skeleton: TenantThemeExportDocument = {
    version: TENANT_THEME_EXPORT_VERSION,
    palettes: {
      primary: {
        anchorStep: "500",
        anchorColor: "#6B4EFF",
        shadeOverrides: {
          "500": "#6B4EFF",
        },
      },
      neutral: {
        anchorStep: "50",
        anchorColor: "#f8fafc",
      },
    },
    semantics: {
      light: {
        "--color-background": "#f8fafc",
        "--color-foreground": "#0f172a",
      },
      dark: {
        "--color-background": "#0b0d14",
        "--color-foreground": "#f8fafc",
      },
    },
    sidebar: {
      light: {
        "--color-sidebar": "#ffffff",
      },
      dark: {
        "--color-sidebar": "#0b0d14",
      },
    },
    badges: {
      light: {
        "--color-badge-success": "#dcfce7",
      },
      dark: {
        "--color-badge-success": "#064e3b",
      },
    },
    effects: {
      shadowCard: {
        light: "0px 4px 20px rgba(0, 0, 0, 0.03)",
        dark: "none",
      },
      gradientPrimary: {
        light: "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
        dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
      },
    },
    chartColors: {
      chart1: "#6B4EFF",
      chart2: "#10b981",
      chart3: "#f59e0b",
      chart4: "#ef4444",
    },
    customTokens: [
      {
        kind: "color",
        name: "widget",
        label: "Widget surface",
        light: "#ffffff",
        dark: "#1a1a2e",
      },
      {
        kind: "gradient",
        name: "hero",
        light: "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
        dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
      },
    ],
    typography: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      bodySize: "0.875rem",
      headingSize: "1.5rem",
    },
    layout: {
      radiusLg: "1rem",
      radiusSm: "0.5rem",
      spacingXs: "0.25rem",
      spacingSm: "0.5rem",
      spacingMd: "1rem",
      spacingBase: "1.5rem",
      spacingLg: "2rem",
      sidebarWidth: "260px",
    },
  };

  return JSON.stringify(skeleton, null, 2);
}

function zodIssuesToImportErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly TenantThemeImportError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));
}

export function validateTenantThemeImport(
  json: string,
): TenantThemeImportValidationResult {
  if (json.trim().length === 0) {
    return { ok: false, errors: [] };
  }

  try {
    const document = parseTenantThemeDocument(json);
    const appearance = buildAppearanceFromDocument(document);
    const parsed = tenantAppearanceSchema.safeParse(appearance);
    if (!parsed.success) {
      return { ok: false, errors: zodIssuesToImportErrors(parsed.error) };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          message:
            error instanceof Error ? error.message : "Unable to import theme.",
        },
      ],
    };
  }
}

export function importTenantTheme(json: string): TenantAppearance {
  const validation = validateTenantThemeImport(json);
  if (!validation.ok) {
    throw new Error(
      validation.errors[0]?.message ?? "Unable to import theme JSON.",
    );
  }
  return validation.data;
}

export const EXAMPLE_VIOLET_DASHBOARD_THEME_JSON = exportTenantTheme({
  palettes: {
    primary: {
      anchorStep: "500",
      anchorColor: "#6B4EFF",
      shadeOverrides: {
        "50": "#f3f0ff",
        "100": "#e4dcf9",
        "200": "#c7b8f3",
        "300": "#aa94ec",
        "400": "#8c6fe6",
        "500": "#6B4EFF",
        "600": "#553cd9",
        "700": "#422db3",
        "800": "#2f208c",
        "900": "#1e1466",
        "950": "#100a3d",
      },
    },
    neutral: {
      anchorStep: "50",
      anchorColor: "#f8fafc",
      shadeOverrides: {
        "50": "#f8fafc",
        "100": "#f1f5f9",
        "200": "#e2e8f0",
        "300": "#cbd5e1",
        "400": "#94a3b8",
        "500": "#64748b",
        "600": "#475569",
        "700": "#334155",
        "800": "#1e293b",
        "900": "#151822",
        "950": "#0b0d14",
      },
    },
  },
  semanticsByScheme: {
    light: {
      "--color-background": "#f8fafc",
      "--color-foreground": "#0f172a",
      "--color-primary": "#6B4EFF",
      "--color-primary-foreground": "#ffffff",
      "--color-primary-hover": "#553cd9",
      "--color-primary-active": "#422db3",
      "--color-muted": "#f1f5f9",
      "--color-muted-foreground": "#64748b",
      "--color-border": "#e2e8f0",
      "--color-border-muted": "#f1f5f9",
      "--color-card": "#ffffff",
      "--color-card-foreground": "#0f172a",
      "--color-popover": "#ffffff",
      "--color-popover-foreground": "#0f172a",
      "--color-backdrop": "#0f172a80",
      "--color-hover": "#f8fafc",
      "--color-active": "#f1f5f9",
      "--color-accent": "#f3f0ff",
      "--color-accent-foreground": "#6B4EFF",
      "--color-badge-default": "#f1f5f9",
      "--color-badge-default-foreground": "#475569",
      "--color-badge-success": "#dcfce7",
      "--color-badge-success-foreground": "#15803d",
      "--color-badge-warning": "#fef9c3",
      "--color-badge-warning-foreground": "#a16207",
      "--color-badge-danger": "#fee2e2",
      "--color-badge-danger-foreground": "#b91c1c",
      "--color-badge-info": "#e0f2fe",
      "--color-badge-info-foreground": "#0369a1",
    },
    dark: {
      "--color-background": "#0b0d14",
      "--color-foreground": "#f8fafc",
      "--color-primary": "#6B4EFF",
      "--color-primary-foreground": "#ffffff",
      "--color-primary-hover": "#8c6fe6",
      "--color-primary-active": "#aa94ec",
      "--color-muted": "#1e293b",
      "--color-muted-foreground": "#94a3b8",
      "--color-border": "#1e293b",
      "--color-border-muted": "#151822",
      "--color-card": "#151822",
      "--color-card-foreground": "#f8fafc",
      "--color-popover": "#151822",
      "--color-popover-foreground": "#f8fafc",
      "--color-backdrop": "#00000099",
      "--color-hover": "#1e293b",
      "--color-active": "#334155",
      "--color-accent": "#1e1466",
      "--color-accent-foreground": "#c7b8f3",
      "--color-badge-default": "#1e293b",
      "--color-badge-default-foreground": "#cbd5e1",
      "--color-badge-success": "#064e3b",
      "--color-badge-success-foreground": "#34d399",
      "--color-badge-warning": "#713f12",
      "--color-badge-warning-foreground": "#facc15",
      "--color-badge-danger": "#7f1d1d",
      "--color-badge-danger-foreground": "#f87171",
      "--color-badge-info": "#0c4a6e",
      "--color-badge-info-foreground": "#38bdf8",
    },
  },
  colorsByScheme: {
    light: {
      "--color-sidebar": "#ffffff",
      "--color-sidebar-foreground": "#64748b",
      "--color-sidebar-border": "#ffffff",
      "--color-sidebar-highlight": "#0f172a",
      "--color-sidebar-hover": "#f8fafc",
      "--color-sidebar-accent": "#f3f0ff",
      "--color-sidebar-accent-foreground": "#6B4EFF",
      "--sidebar-width": "260px",
    },
    dark: {
      "--color-sidebar": "#0b0d14",
      "--color-sidebar-foreground": "#94a3b8",
      "--color-sidebar-border": "#0b0d14",
      "--color-sidebar-highlight": "#ffffff",
      "--color-sidebar-hover": "#151822",
      "--color-sidebar-accent": "#1e1466",
      "--color-sidebar-accent-foreground": "#aa94ec",
      "--sidebar-width": "260px",
    },
  },
  effects: {
    shadowCard: {
      light: "0px 4px 20px rgba(0, 0, 0, 0.03)",
      dark: "none",
    },
    gradientPrimary: {
      light: "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
      dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
    },
  },
  chartColors: {
    chart1: "#6B4EFF",
    chart2: "#10b981",
    chart3: "#f59e0b",
    chart4: "#ef4444",
  },
  customTokens: [
    {
      kind: "color",
      name: "widget",
      label: "Widget surface",
      light: "#ffffff",
      dark: "#1a1a2e",
    },
    {
      kind: "gradient",
      name: "hero",
      light: "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
      dark: "linear-gradient(135deg, #422db3 0%, #1e1466 100%)",
    },
  ],
  fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
  fontSizes: {
    body: "0.875rem",
    heading: "1.5rem",
  },
  radius: "1rem",
  radiusSm: "0.5rem",
  spacingScale: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    base: "1.5rem",
    lg: "2rem",
  },
});
