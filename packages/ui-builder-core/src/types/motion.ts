export type MotionEntrance = "none" | "fade" | "slide-up" | "scale";
export type MotionHover = "none" | "lift" | "glow";
export type MotionTransition = "none" | "layout" | "all";

export interface MotionPreset {
  readonly entrance?: MotionEntrance;
  readonly durationMs?: number;
  readonly delayMs?: number;
  readonly staggerIndex?: boolean;
  readonly hover?: MotionHover;
  readonly transition?: MotionTransition;
}

export const MOTION_DURATION_MAX_MS = 2000;
