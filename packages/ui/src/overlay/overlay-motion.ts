import type { CSSProperties } from "react";

const OVERLAY_TRANSITION_EASING = "ease-in-out";

type OverlayTransitionProperty = "opacity" | "transform" | "opacity-transform";

const TRANSITION_PROPERTY: Record<OverlayTransitionProperty, string> = {
  opacity: "opacity",
  transform: "transform",
  "opacity-transform": "opacity, transform",
};

export function overlayTransitionStyle(
  durationMs: number,
  property: OverlayTransitionProperty,
): CSSProperties | undefined {
  if (durationMs === 0) {
    return undefined;
  }

  return {
    transitionProperty: TRANSITION_PROPERTY[property],
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: OVERLAY_TRANSITION_EASING,
  };
}
