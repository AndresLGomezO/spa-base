import type { CSSProperties } from "react";

import type {
  MotionHoverTransform,
  MotionHoverSurface,
  MotionPreset,
} from "@repo/ui-builder-core";

const ENTRANCE_CLASS: Record<NonNullable<MotionPreset["entrance"]>, string> = {
  none: "",
  fade: "ui-motion-entrance-fade",
  "slide-up": "ui-motion-entrance-slide-up",
  scale: "ui-motion-entrance-scale",
};

const HOVER_INTERACTIVE_CLASS = "ui-motion-hover-interactive";

const HOVER_SURFACE_BG: Record<Exclude<MotionHoverSurface, "none">, string> = {
  default: "var(--color-hover)",
  accent: "var(--color-accent-hover)",
  muted: "var(--color-muted)",
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

  if (surface !== "none") {
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
    classes.push(HOVER_INTERACTIVE_CLASS);
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

  const style = resolveInteractiveHoverStyle(preset);

  return {
    className: classes.filter(Boolean).join(" "),
    ...(style ? { style } : {}),
  };
}

export const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)" as const;
