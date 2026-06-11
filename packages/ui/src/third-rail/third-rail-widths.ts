export type ThirdRailWidthFraction = "full" | "1/2" | "1/3" | "1/4" | "1/5";

export interface ThirdRailWidthConfig {
  readonly base?: ThirdRailWidthFraction;
  readonly md?: ThirdRailWidthFraction;
  readonly lg?: ThirdRailWidthFraction;
}

const FRACTION_CLASS: Record<ThirdRailWidthFraction, string> = {
  full: "w-full",
  "1/2": "w-1/2",
  "1/3": "w-1/3",
  "1/4": "w-1/4",
  "1/5": "w-1/5",
};

const DEFAULT_WIDTHS: Required<ThirdRailWidthConfig> = {
  base: "full",
  md: "1/2",
  lg: "1/4",
};

function fractionClass(
  fraction: ThirdRailWidthFraction,
  prefix?: "md" | "lg",
): string {
  const base = FRACTION_CLASS[fraction];
  if (!prefix) {
    return base;
  }

  const utility = base.replace(/^w-/, "");
  return `${prefix}:w-${utility}`;
}

export function resolveThirdRailWidthClasses(
  widths?: ThirdRailWidthConfig,
): string {
  const resolved = { ...DEFAULT_WIDTHS, ...widths };

  return [
    fractionClass(resolved.base),
    fractionClass(resolved.md, "md"),
    fractionClass(resolved.lg, "lg"),
  ].join(" ");
}
