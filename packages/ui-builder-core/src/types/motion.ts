/**
 * @ai-context-sync
 * MotionPreset — keep in sync with packages/ai-context/src/atoms/ui/motion.ts
 */
export type MotionEntrance = "none" | "fade" | "slide-up" | "scale";

/** @deprecated Prefer `hoverTransform`. Kept for legacy layout JSON. */
export type MotionHover = "none" | "lift" | "glow";

export type MotionHoverSurface =
  | "none"
  | "default"
  | "accent"
  | "muted"
  | "info"
  | "destructive"
  | "warning"
  | "success"
  | "glow-border";

export type MotionHoverTransform =
  | "none"
  | "lift"
  | "scale-up"
  | "scale-down"
  | "glow";

export type MotionTransition = "none" | "layout" | "all";

/** Click/press visual feedback on component rows. */
export type MotionPress =
  | "none"
  | "ripple"
  | "glow"
  | "wave"
  | "neon"
  | "pop"
  | "slide";

/**
 * Theme color for press overlays and glows.
 * `default` maps to primary; `foreground` for light overlays on dark surfaces.
 */
export type MotionPressColor =
  | "default"
  | "accent"
  | "muted"
  | "info"
  | "destructive"
  | "warning"
  | "success"
  | "foreground";

export interface MotionPreset {
  readonly entrance?: MotionEntrance;
  readonly durationMs?: number;
  readonly delayMs?: number;
  readonly staggerIndex?: boolean;
  /** @deprecated Prefer `hoverSurface` / `hoverTransform`. */
  readonly hover?: MotionHover;
  readonly hoverSurface?: MotionHoverSurface;
  readonly hoverTransform?: MotionHoverTransform;
  readonly hoverRotateDeg?: number;
  readonly hoverDurationMs?: number;
  readonly transition?: MotionTransition;
  readonly press?: MotionPress;
  readonly pressColor?: MotionPressColor;
  readonly pressDurationMs?: number;
  readonly pressScale?: number;
  readonly pressOpacity?: number;
  readonly pressGlowBlurPx?: number;
}

export const MOTION_DURATION_MAX_MS = 2000;

export const MOTION_HOVER_ROTATE_DEG_MIN = -45;
export const MOTION_HOVER_ROTATE_DEG_MAX = 45;

export const MOTION_PRESS_SCALE_MIN = 0.5;
export const MOTION_PRESS_SCALE_MAX = 2;
export const MOTION_PRESS_OPACITY_MIN = 0;
export const MOTION_PRESS_OPACITY_MAX = 1;
export const MOTION_PRESS_GLOW_BLUR_MAX_PX = 80;

export const MOTION_PRESS_HOST_KINDS = [
  "ripple",
  "wave",
  "slide",
] as const satisfies readonly MotionPress[];

export function motionPressNeedsHost(
  press: MotionPress | undefined,
): press is (typeof MOTION_PRESS_HOST_KINDS)[number] {
  return (
    press !== undefined &&
    (MOTION_PRESS_HOST_KINDS as readonly string[]).includes(press)
  );
}
