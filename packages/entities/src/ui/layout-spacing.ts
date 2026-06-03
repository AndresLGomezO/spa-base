import { z } from "zod";

export interface LayoutSpacing {
  readonly marginX?: number;
  readonly marginY?: number;
  readonly marginTop?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
  readonly marginRight?: number;
  readonly padding?: number;
}

export const LAYOUT_SPACING_MIN_PX = 0;
export const LAYOUT_SPACING_MAX_PX = 48;

export const LAYOUT_SPACING_KEYS = [
  "marginX",
  "marginY",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "padding",
] as const satisfies readonly (keyof LayoutSpacing)[];

export type LayoutSpacingKey = (typeof LAYOUT_SPACING_KEYS)[number];

export const layoutSpacingSchemaShape = {
  marginX: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
  marginY: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
  marginTop: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
  marginBottom: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
  marginLeft: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
  marginRight: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
  padding: z
    .number()
    .int()
    .min(LAYOUT_SPACING_MIN_PX)
    .max(LAYOUT_SPACING_MAX_PX)
    .optional(),
} as const;
