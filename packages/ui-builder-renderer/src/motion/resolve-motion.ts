import type { CSSProperties } from "react";

import type {
  MotionHoverTransform,
  MotionHoverSurface,
  MotionPress,
  MotionPressColor,
  MotionPreset,
} from "@repo/ui-builder-core";

const ENTRANCE_CLASS: Record<NonNullable<MotionPreset["entrance"]>, string> = {
  none: "",
  fade: "ui-motion-entrance-fade",
  "slide-up": "ui-motion-entrance-slide-up",
  scale: "ui-motion-entrance-scale",
};

export const MOTION_HOVER_INTERACTIVE_CLASS = "ui-motion-hover-interactive";
export const MOTION_HOVER_GLOW_BORDER_CLASS = "ui-motion-hover-glow-border";

export const MOTION_PRESS_CLASS = "ui-motion-press";
export const MOTION_PRESS_KIND_CLASS: Record<
  Exclude<MotionPress, "none">,
  string
> = {
  ripple: "ui-motion-press-ripple",
  glow: "ui-motion-press-glow",
  wave: "ui-motion-press-wave",
  neon: "ui-motion-press-neon",
  pop: "ui-motion-press-pop",
  slide: "ui-motion-press-slide",
};

const HOVER_SURFACE_BG: Record<
  Exclude<MotionHoverSurface, "none" | "glow-border">,
  string
> = {
  default: "var(--color-hover)",
  accent: "var(--color-accent-hover)",
  muted: "var(--color-muted)",
  info: "color-mix(in oklch, var(--color-info) 24%, transparent)",
  destructive: "color-mix(in oklch, var(--color-destructive) 40%, transparent)",
  warning: "color-mix(in oklch, var(--color-warning) 40%, transparent)",
  success: "color-mix(in oklch, var(--color-success) 40%, transparent)",
};

const PRESS_COLOR: Record<MotionPressColor, string> = {
  default: "var(--color-primary)",
  accent: "var(--color-accent)",
  muted: "var(--color-muted-foreground)",
  info: "var(--color-info)",
  destructive: "var(--color-destructive)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
  foreground: "var(--color-foreground)",
};

const DEFAULT_PRESS_DURATION_MS: Record<
  Exclude<MotionPress, "none">,
  number
> = {
  ripple: 600,
  glow: 200,
  wave: 500,
  neon: 200,
  pop: 200,
  slide: 500,
};

const DEFAULT_PRESS_GLOW_BLUR_PX: Record<"glow" | "neon", number> = {
  glow: 20,
  neon: 40,
};

export interface ResolvedMotionPreset {
  readonly className: string;
  readonly style?: CSSProperties;
}

function mapLegacyHoverTransform(
  hover: MotionPreset["hover"],
): MotionHoverTransform {
  switch (hover) {
    case "lift":
      return "lift";
    case "glow":
      return "glow";
    default:
      return "none";
  }
}

function resolveEffectiveHoverTransform(
  preset: MotionPreset,
): MotionHoverTransform {
  if (preset.hoverTransform !== undefined) {
    return preset.hoverTransform;
  }
  if (preset.hover !== undefined) {
    return mapLegacyHoverTransform(preset.hover);
  }
  return "none";
}

function resolveEffectiveHoverSurface(
  preset: MotionPreset,
): MotionHoverSurface {
  return preset.hoverSurface ?? "none";
}

function buildHoverTransform(
  transform: MotionHoverTransform,
  rotateDeg: number | undefined,
): string | undefined {
  const parts: string[] = [];

  switch (transform) {
    case "lift":
      parts.push("translateY(-2px)");
      break;
    case "scale-up":
      parts.push("scale(1.02)");
      break;
    case "scale-down":
      parts.push("scale(0.98)");
      break;
    case "glow":
    case "none":
      break;
    default:
      break;
  }

  if (rotateDeg !== undefined && rotateDeg !== 0) {
    parts.push(`rotate(${rotateDeg}deg)`);
  }

  return parts.length > 0 ? parts.join(" ") : undefined;
}

function buildHoverShadow(transform: MotionHoverTransform): string | undefined {
  if (transform === "glow") {
    return "0 0 0 2px var(--color-primary, currentColor)";
  }
  if (transform === "lift") {
    return "0 4px 12px rgb(0 0 0 / 0.08)";
  }
  return undefined;
}

function hasInteractiveHover(preset: MotionPreset): boolean {
  const surface = resolveEffectiveHoverSurface(preset);
  const transform = resolveEffectiveHoverTransform(preset);
  const rotateDeg = preset.hoverRotateDeg ?? 0;
  return surface !== "none" || transform !== "none" || rotateDeg !== 0;
}

function resolveInteractiveHoverStyle(
  preset: MotionPreset,
): CSSProperties | undefined {
  if (!hasInteractiveHover(preset)) {
    return undefined;
  }

  const surface = resolveEffectiveHoverSurface(preset);
  const transform = resolveEffectiveHoverTransform(preset);
  const hoverTransform = buildHoverTransform(transform, preset.hoverRotateDeg);
  const hoverShadow = buildHoverShadow(transform);
  const durationMs = preset.hoverDurationMs ?? 150;

  const style: Record<string, string> = {
    "--motion-hover-duration": `${durationMs}ms`,
  };

  if (surface !== "none" && surface !== "glow-border") {
    style["--motion-hover-bg"] = HOVER_SURFACE_BG[surface];
  }

  if (hoverTransform) {
    style["--motion-hover-transform"] = hoverTransform;
  }

  if (hoverShadow) {
    style["--motion-hover-shadow"] = hoverShadow;
  }

  return style as CSSProperties;
}

function resolveEffectivePress(preset: MotionPreset): MotionPress {
  return preset.press ?? "none";
}

function defaultPressDurationMs(press: Exclude<MotionPress, "none">): number {
  return DEFAULT_PRESS_DURATION_MS[press];
}

function resolvePressStyle(preset: MotionPreset): CSSProperties | undefined {
  const press = resolveEffectivePress(preset);
  if (press === "none") {
    return undefined;
  }

  const color = PRESS_COLOR[preset.pressColor ?? "default"];
  const durationMs = preset.pressDurationMs ?? defaultPressDurationMs(press);
  const opacity = preset.pressOpacity ?? 0.4;
  const scale = preset.pressScale ?? 1.2;
  const glowBlur =
    preset.pressGlowBlurPx ??
    (press === "glow" || press === "neon"
      ? DEFAULT_PRESS_GLOW_BLUR_PX[press]
      : 20);

  return {
    "--motion-press-color": color,
    "--motion-press-duration": `${durationMs}ms`,
    "--motion-press-opacity": String(opacity),
    "--motion-press-scale": String(scale),
    "--motion-press-glow-blur": `${glowBlur}px`,
  } as CSSProperties;
}

function mergeResolvedStyles(
  ...parts: readonly (CSSProperties | undefined)[]
): CSSProperties | undefined {
  const merged: CSSProperties = {};
  let hasAny = false;
  for (const part of parts) {
    if (!part) {
      continue;
    }
    hasAny = true;
    Object.assign(merged, part);
  }
  return hasAny ? merged : undefined;
}

export function resolveMotionPreset(
  preset: MotionPreset | undefined,
  index?: number,
): ResolvedMotionPreset {
  if (!preset) {
    return { className: "" };
  }

  const classes: string[] = [];
  const entrance = preset.entrance ?? "none";
  if (entrance !== "none") {
    classes.push(ENTRANCE_CLASS[entrance]);
  }

  if (hasInteractiveHover(preset)) {
    classes.push(MOTION_HOVER_INTERACTIVE_CLASS);
    if (resolveEffectiveHoverSurface(preset) === "glow-border") {
      classes.push(MOTION_HOVER_GLOW_BORDER_CLASS);
    }
  }

  const press = resolveEffectivePress(preset);
  if (press !== "none") {
    classes.push(MOTION_PRESS_CLASS);
    classes.push(MOTION_PRESS_KIND_CLASS[press]);
  }

  if (preset.transition === "layout") {
    classes.push("ui-motion-transition-layout");
  } else if (preset.transition === "all") {
    classes.push("ui-motion-transition-all");
  }

  if (preset.durationMs !== undefined) {
    classes.push(`ui-motion-duration-${preset.durationMs}`);
  }

  if (preset.delayMs !== undefined) {
    classes.push(`ui-motion-delay-${preset.delayMs}`);
  }

  if (preset.staggerIndex && index !== undefined) {
    classes.push(`ui-motion-stagger-${index}`);
  }

  const style = mergeResolvedStyles(
    resolveInteractiveHoverStyle(preset),
    resolvePressStyle(preset),
  );

  return {
    className: classes.filter(Boolean).join(" "),
    ...(style ? { style } : {}),
  };
}

/** Inline backgrounds win over class-based :hover; park them on --motion-rest-bg instead. */
export function mergeMotionPresetStyle(
  baseStyle: CSSProperties | undefined,
  motionPreset: ResolvedMotionPreset,
): CSSProperties {
  const merged: CSSProperties = { ...baseStyle, ...motionPreset.style };

  if (!motionPreset.className.includes(MOTION_HOVER_INTERACTIVE_CLASS)) {
    return merged;
  }

  const restBackground =
    baseStyle?.backgroundColor ??
    (typeof baseStyle?.background === "string"
      ? baseStyle.background
      : undefined);

  if (restBackground === undefined) {
    return merged;
  }

  const cssVars = merged as Record<string, string | number | undefined>;
  cssVars["--motion-rest-bg"] = restBackground;
  delete merged.backgroundColor;
  if (merged.background === restBackground) {
    delete merged.background;
  }

  return merged;
}

export const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)" as const;
