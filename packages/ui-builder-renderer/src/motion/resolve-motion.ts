import type { MotionPreset } from "@repo/ui-builder-core";

const ENTRANCE_CLASS: Record<NonNullable<MotionPreset["entrance"]>, string> = {
  none: "",
  fade: "ui-motion-entrance-fade",
  "slide-up": "ui-motion-entrance-slide-up",
  scale: "ui-motion-entrance-scale",
};

const HOVER_CLASS: Record<NonNullable<MotionPreset["hover"]>, string> = {
  none: "",
  lift: "ui-motion-hover-lift",
  glow: "ui-motion-hover-glow",
};

export function resolveMotionPreset(
  preset: MotionPreset | undefined,
  index?: number,
): string {
  if (!preset) {
    return "";
  }

  const classes: string[] = [];
  const entrance = preset.entrance ?? "none";
  if (entrance !== "none") {
    classes.push(ENTRANCE_CLASS[entrance]);
  }

  const hover = preset.hover ?? "none";
  if (hover !== "none") {
    classes.push(HOVER_CLASS[hover]);
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

  return classes.filter(Boolean).join(" ");
}

export const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)" as const;
