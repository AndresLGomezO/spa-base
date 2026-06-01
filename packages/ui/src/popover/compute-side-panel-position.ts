import type { CSSProperties } from "react";

export type SidePopoverPreferredPlacement = "right-start" | "right-end";

export type SidePopoverResolvedPlacement =
  | "right-start"
  | "right-end"
  | "left-start"
  | "left-end"
  | "top-start"
  | "bottom-start";

export interface RectLike {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface PanelSize {
  readonly width: number;
  readonly height: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface ComputeSidePanelPositionInput {
  readonly preferred: SidePopoverPreferredPlacement;
  readonly triggerRect: RectLike;
  readonly panelSize: PanelSize;
  readonly viewport?: ViewportSize;
  readonly padding?: number;
  readonly gap?: number;
}

export interface ComputeSidePanelPositionResult {
  readonly style: CSSProperties;
  readonly resolvedPlacement: SidePopoverResolvedPlacement;
}

const DEFAULT_PADDING = 8;
const DEFAULT_GAP = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampHorizontalLeft(
  left: number,
  panelWidth: number,
  viewportWidth: number,
  padding: number,
): number {
  return clamp(left, padding, viewportWidth - panelWidth - padding);
}

function preferTopAlign(
  preferred: SidePopoverPreferredPlacement,
  spaceBelow: number,
  spaceAbove: number,
): boolean {
  if (preferred === "right-start") {
    return spaceBelow >= spaceAbove;
  }

  return spaceBelow > spaceAbove;
}

function besideTriggerStyle(
  side: "right" | "left",
  vertical: "start" | "end",
  input: Required<
    Pick<ComputeSidePanelPositionInput, "triggerRect" | "panelSize">
  > & {
    padding: number;
    gap: number;
    viewport: ViewportSize;
  },
): ComputeSidePanelPositionResult {
  const { triggerRect, panelSize, padding, gap, viewport } = input;
  const resolvedPlacement: SidePopoverResolvedPlacement =
    side === "right"
      ? vertical === "start"
        ? "right-start"
        : "right-end"
      : vertical === "start"
        ? "left-start"
        : "left-end";

  const left =
    side === "right"
      ? triggerRect.right + gap
      : triggerRect.left - gap - panelSize.width;

  const spaceBelow = viewport.height - triggerRect.top - padding;
  const spaceAbove = triggerRect.bottom - padding;
  const useTopAlign = vertical === "start";

  if (useTopAlign) {
    let top = clamp(triggerRect.top, padding, viewport.height - padding);
    let maxHeight = viewport.height - top - padding;

    if (panelSize.height > maxHeight) {
      top = Math.max(padding, viewport.height - padding - maxHeight);
      maxHeight = viewport.height - top - padding;
    }

    return {
      resolvedPlacement,
      style: {
        position: "fixed",
        left: clampHorizontalLeft(
          left,
          panelSize.width,
          viewport.width,
          padding,
        ),
        top,
        maxHeight,
      },
    };
  }

  const bottom = viewport.height - triggerRect.bottom;
  let maxHeight = triggerRect.bottom - padding;

  if (panelSize.height > maxHeight) {
    maxHeight = Math.max(padding, viewport.height - padding * 2);
  }

  return {
    resolvedPlacement,
    style: {
      position: "fixed",
      left: clampHorizontalLeft(left, panelSize.width, viewport.width, padding),
      bottom,
      maxHeight,
    },
  };
}

function stackedTriggerStyle(
  stack: "above" | "below",
  input: Required<
    Pick<ComputeSidePanelPositionInput, "triggerRect" | "panelSize">
  > & {
    padding: number;
    gap: number;
    viewport: ViewportSize;
  },
): ComputeSidePanelPositionResult {
  const { triggerRect, panelSize, padding, gap, viewport } = input;
  const resolvedPlacement: SidePopoverResolvedPlacement =
    stack === "above" ? "top-start" : "bottom-start";

  const left = clampHorizontalLeft(
    triggerRect.left,
    panelSize.width,
    viewport.width,
    padding,
  );

  if (stack === "above") {
    const bottom = viewport.height - triggerRect.top + gap;
    const maxHeight = Math.min(
      panelSize.height,
      triggerRect.top - gap - padding,
    );

    return {
      resolvedPlacement,
      style: {
        position: "fixed",
        left,
        bottom,
        maxHeight: Math.max(padding, maxHeight),
      },
    };
  }

  const top = triggerRect.bottom + gap;
  const maxHeight = viewport.height - top - padding;

  return {
    resolvedPlacement,
    style: {
      position: "fixed",
      left,
      top,
      maxHeight: Math.max(padding, maxHeight),
    },
  };
}

export function computeSidePanelPosition(
  input: ComputeSidePanelPositionInput,
): ComputeSidePanelPositionResult {
  const padding = input.padding ?? DEFAULT_PADDING;
  const gap = input.gap ?? DEFAULT_GAP;
  const viewport = input.viewport ?? {
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  };
  const { preferred, triggerRect, panelSize } = input;

  const spaceBelow = viewport.height - triggerRect.top - padding;
  const spaceAbove = triggerRect.bottom - padding;
  const vertical: "start" | "end" = preferTopAlign(
    preferred,
    spaceBelow,
    spaceAbove,
  )
    ? "start"
    : "end";

  const baseInput = {
    triggerRect,
    panelSize,
    padding,
    gap,
    viewport,
  };

  const rightLeft = triggerRect.right + gap;
  const leftLeft = triggerRect.left - gap - panelSize.width;
  const rightOverflow = Math.max(
    0,
    rightLeft + panelSize.width - (viewport.width - padding),
  );
  const leftOverflow = Math.max(0, padding - leftLeft);

  if (rightOverflow === 0) {
    return besideTriggerStyle("right", vertical, baseInput);
  }

  if (leftOverflow === 0) {
    return besideTriggerStyle("left", vertical, baseInput);
  }

  if (leftOverflow < rightOverflow) {
    return besideTriggerStyle("left", vertical, baseInput);
  }

  if (rightOverflow < leftOverflow) {
    return besideTriggerStyle("right", vertical, baseInput);
  }

  const roomAbove = triggerRect.top - gap - padding;
  const roomBelow = viewport.height - triggerRect.bottom - gap - padding;

  if (roomAbove >= roomBelow && roomAbove >= panelSize.height) {
    return stackedTriggerStyle("above", baseInput);
  }

  if (roomBelow >= roomAbove) {
    return stackedTriggerStyle("below", baseInput);
  }

  if (roomAbove > roomBelow) {
    return stackedTriggerStyle("above", baseInput);
  }

  return stackedTriggerStyle("below", baseInput);
}
