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
  const primary = p("600", "#008bd4");
  const primaryForeground = COLOR_WHITE;

  return {
    "--color-primary": primary,
    "--color-primary-foreground": primaryForeground,
    "--color-primary-hover": p("700", primary),
    "--color-primary-active": p("800", primary),

    "--color-secondary": n("100", background),
    "--color-secondary-foreground": n("900", foreground),

    "--color-accent": p("50", background),
    "--color-accent-foreground": p("900", foreground),
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

    "--color-border": n("200", background),
    "--color-border-muted": n("100", background),
    "--color-border-strong": n("300", background),
    "--color-divider": n("200", background),

    "--color-text-primary": foreground,
    "--color-text-secondary": n("600", foreground),
    "--color-text-tertiary": n("400", foreground),
    "--color-text-inverse": COLOR_WHITE,
    "--color-text-disabled": n("400", foreground),

    "--color-hover": n("100", background),
    "--color-active": n("200", background),
    "--color-focus": p("500", primary),

    "--color-input-background": background,
    "--color-input-border": n("200", background),
    "--color-input-focus": p("500", primary),

    "--color-skeleton": n("100", background),
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
  const primary = p("600", "#008bd4");
  const primaryForeground = COLOR_WHITE;

  return {
    "--color-primary": primary,
    "--color-primary-foreground": primaryForeground,
    "--color-primary-hover": p("500", primary),
    "--color-primary-active": p("400", primary),

    "--color-secondary": n("800", background),
    "--color-secondary-foreground": foreground,

    "--color-accent": n("800", background),
    "--color-accent-foreground": foreground,
    "--color-accent-hover": n("700", background),
    "--color-accent-active": n("600", background),

    "--color-muted": n("900", background),
    "--color-muted-foreground": n("400", foreground),

    "--color-background": background,
    "--color-foreground": foreground,

    "--color-surface": background,
    "--color-surface-foreground": foreground,

    "--color-card": n("900", background),
    "--color-card-foreground": foreground,

    "--color-popover": n("900", background),
    "--color-popover-foreground": foreground,

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
