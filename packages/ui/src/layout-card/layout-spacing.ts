import type { CSSProperties } from "react";

export interface LayoutSpacing {
  readonly marginX?: number;
  readonly marginY?: number;
  readonly marginTop?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
  readonly marginRight?: number;
  readonly padding?: number;
}

export function getLayoutSpacingStyle(
  spacing: LayoutSpacing | undefined,
): CSSProperties {
  if (!spacing) {
    return {};
  }

  const style: CSSProperties = {};

  if (spacing.padding !== undefined) {
    style.padding = `${spacing.padding}px`;
  }

  const marginTop = spacing.marginTop ?? spacing.marginY;
  const marginBottom = spacing.marginBottom ?? spacing.marginY;
  const marginLeft = spacing.marginLeft ?? spacing.marginX;
  const marginRight = spacing.marginRight ?? spacing.marginX;

  if (marginTop !== undefined) {
    style.marginTop = `${marginTop}px`;
  }
  if (marginBottom !== undefined) {
    style.marginBottom = `${marginBottom}px`;
  }
  if (marginLeft !== undefined) {
    style.marginLeft = `${marginLeft}px`;
  }
  if (marginRight !== undefined) {
    style.marginRight = `${marginRight}px`;
  }

  return style;
}
