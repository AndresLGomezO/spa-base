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
}

export const MOTION_DURATION_MAX_MS = 2000;

export const MOTION_HOVER_ROTATE_DEG_MIN = -45;
export const MOTION_HOVER_ROTATE_DEG_MAX = 45;
