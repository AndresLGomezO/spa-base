import type { AppearanceColorScheme } from "./dark-mode-remaps.js";

const COLOR_WHITE = "#ffffff";
const COLOR_BLACK = "#0e0e11";

function scaleVar(
  vars: Record<string, string>,
  kind: "primary" | "neutral",
  step: string,
): string | undefined {
  return vars[`--color-${kind}-${step}`];
}

function scaleVarOr(
  vars: Record<string, string>,
  kind: "primary" | "neutral",
  step: string,
  fallback: string,
): string {
  return scaleVar(vars, kind, step) ?? fallback;
}

function resolveLightBadgeSemantics(
  n: (step: string, fallback: string) => string,
  p: (step: string, fallback: string) => string,
  foreground: string,
): Record<string, string> {
  return {
    "--color-badge-default": n("100", foreground),
    "--color-badge-default-foreground": n("600", foreground),
    "--color-badge-success": "#dcfce7",
    "--color-badge-success-foreground": "#15803d",
    "--color-badge-warning": "#fef9c3",
    "--color-badge-warning-foreground": "#a16207",
    "--color-badge-danger": "#fee2e2",
    "--color-badge-danger-foreground": "#b91c1c",
    "--color-badge-info": "#e0f2fe",
    "--color-badge-info-foreground": "#0369a1",
    "--color-badge-background": n("100", foreground),
    "--color-badge-foreground": n("600", foreground),
  };
}

function resolveDarkBadgeSemantics(
  n: (step: string, fallback: string) => string,
  p: (step: string, fallback: string) => string,
): Record<string, string> {
  return {
    "--color-badge-default": n("800", COLOR_BLACK),
    "--color-badge-default-foreground": n("300", COLOR_WHITE),
    "--color-badge-success": "#064e3b",
    "--color-badge-success-foreground": "#34d399",
    "--color-badge-warning": "#713f12",
    "--color-badge-warning-foreground": "#facc15",
    "--color-badge-danger": "#7f1d1d",
    "--color-badge-danger-foreground": "#f87171",
    "--color-badge-info": "#0c4a6e",
    "--color-badge-info-foreground": "#38bdf8",
    "--color-badge-background": n("800", COLOR_BLACK),
    "--color-badge-foreground": n("300", COLOR_WHITE),
  };
}

function resolveLightSidebarSemantics(
  n: (step: string, fallback: string) => string,
  p: (step: string, fallback: string) => string,
  background: string,
): Record<string, string> {
  const sidebar = COLOR_WHITE;
  const sidebarAccent = p("50", background);
  const sidebarAccentForeground = p("500", background);

  return {
    "--color-sidebar": sidebar,
    "--color-sidebar-foreground": n("500", COLOR_BLACK),
    "--color-sidebar-border": sidebar,
    "--color-sidebar-highlight": COLOR_BLACK,
    "--color-sidebar-hover": n("50", background),
    "--color-sidebar-accent": sidebarAccent,
    "--color-sidebar-accent-foreground": sidebarAccentForeground,
  };
}

function resolveDarkSidebarSemantics(
  n: (step: string, fallback: string) => string,
  p: (step: string, fallback: string) => string,
  background: string,
): Record<string, string> {
  const sidebar = background;
  const sidebarAccent = p("900", background);
  const sidebarAccentForeground = p("400", background);

  return {
    "--color-sidebar": sidebar,
    "--color-sidebar-foreground": n("400", COLOR_WHITE),
    "--color-sidebar-border": sidebar,
    "--color-sidebar-highlight": COLOR_WHITE,
    "--color-sidebar-hover": n("900", background),
    "--color-sidebar-accent": sidebarAccent,
    "--color-sidebar-accent-foreground": sidebarAccentForeground,
  };
}

/** Mirrors semantics.css — resolved to concrete hex from generated palette scales. */
export function resolveLightSemanticsFromPalette(
  paletteVars: Record<string, string>,
): Record<string, string> {
  const n = (step: string, fallback: string) =>
    scaleVarOr(paletteVars, "neutral", step, fallback);
  const p = (step: string, fallback: string) =>
    scaleVarOr(paletteVars, "primary", step, fallback);

  const background = n("50", "#f7f7f8");
  const foreground = n("950", COLOR_BLACK);
  const primary = p("500", "#008bd4");
  const primaryForeground = COLOR_WHITE;

  return {
    "--color-primary": primary,
    "--color-primary-foreground": primaryForeground,
    "--color-primary-hover": p("600", primary),
    "--color-primary-active": p("700", primary),

    "--color-secondary": n("100", background),
    "--color-secondary-foreground": n("900", foreground),

    "--color-accent": p("50", background),
    "--color-accent-foreground": p("500", foreground),
    "--color-accent-hover": p("100", background),
    "--color-accent-active": p("200", background),

    "--color-muted": n("100", background),
    "--color-muted-foreground": n("500", foreground),

    "--color-background": background,
    "--color-foreground": foreground,

    "--color-surface": background,
    "--color-surface-foreground": foreground,

    "--color-card": COLOR_WHITE,
    "--color-card-foreground": foreground,

    "--color-popover": COLOR_WHITE,
    "--color-popover-foreground": foreground,

    "--color-backdrop": "#0f172a80",

    "--color-border": n("200", background),
    "--color-border-muted": n("100", background),
    "--color-border-strong": n("300", background),
    "--color-divider": n("200", background),

    "--color-text-primary": foreground,
    "--color-text-secondary": n("600", foreground),
    "--color-text-tertiary": n("400", foreground),
    "--color-text-inverse": COLOR_WHITE,
    "--color-text-disabled": n("400", foreground),

    "--color-hover": n("50", background),
    "--color-active": n("100", background),
    "--color-focus": p("500", primary),

    "--color-input-background": background,
    "--color-input-border": n("200", background),
    "--color-input-focus": p("500", primary),

    "--color-skeleton": n("100", background),

    ...resolveLightBadgeSemantics(n, p, foreground),
    ...resolveLightSidebarSemantics(n, p, background),
  };
}

/** Mirrors dark.css — resolved to concrete hex from generated palette scales. */
export function resolveDarkSemanticsFromPalette(
  paletteVars: Record<string, string>,
): Record<string, string> {
  const n = (step: string, fallback: string) =>
    scaleVarOr(paletteVars, "neutral", step, fallback);
  const p = (step: string, fallback: string) =>
    scaleVarOr(paletteVars, "primary", step, fallback);

  const background = n("950", COLOR_BLACK);
  const foreground = n("50", COLOR_WHITE);
  const primary = p("500", "#008bd4");
  const primaryForeground = COLOR_WHITE;

  return {
    "--color-primary": primary,
    "--color-primary-foreground": primaryForeground,
    "--color-primary-hover": p("400", primary),
    "--color-primary-active": p("300", primary),

    "--color-secondary": n("800", background),
    "--color-secondary-foreground": foreground,

    "--color-accent": p("900", background),
    "--color-accent-foreground": p("300", foreground),
    "--color-accent-hover": p("800", background),
    "--color-accent-active": p("700", background),

    "--color-muted": n("800", background),
    "--color-muted-foreground": n("400", foreground),

    "--color-background": background,
    "--color-foreground": foreground,

    "--color-surface": background,
    "--color-surface-foreground": foreground,

    "--color-card": n("900", background),
    "--color-card-foreground": foreground,

    "--color-popover": n("900", background),
    "--color-popover-foreground": foreground,

    "--color-backdrop": "#00000099",

    "--color-border": n("800", background),
    "--color-border-muted": n("900", background),
    "--color-border-strong": n("700", background),
    "--color-divider": n("800", background),

    "--color-text-primary": foreground,
    "--color-text-secondary": n("400", foreground),
    "--color-text-tertiary": n("500", foreground),
    "--color-text-inverse": n("950", COLOR_BLACK),
    "--color-text-disabled": n("600", foreground),

    "--color-hover": n("800", background),
    "--color-active": n("700", background),
    "--color-focus": p("500", primary),

    "--color-input-background": background,
    "--color-input-border": n("800", background),
    "--color-input-focus": p("500", primary),

    "--color-skeleton": n("900", background),

    ...resolveDarkBadgeSemantics(n, p),
    ...resolveDarkSidebarSemantics(n, p, background),
  };
}

export function resolveSemanticsFromPalette(
  paletteVars: Record<string, string>,
  colorScheme: AppearanceColorScheme,
): Record<string, string> {
  return colorScheme === "dark"
    ? resolveDarkSemanticsFromPalette(paletteVars)
    : resolveLightSemanticsFromPalette(paletteVars);
}

export function hasPaletteScaleVariables(
  vars: Record<string, string>,
): boolean {
  return Object.keys(vars).some(
    (key) =>
      key.startsWith("--color-primary-") || key.startsWith("--color-neutral-"),
  );
}
