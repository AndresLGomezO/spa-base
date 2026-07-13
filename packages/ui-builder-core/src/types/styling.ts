/**
 * @ai-context-sync
 * LayoutCondition / ConditionalStyleRule — keep in sync with
 * packages/ai-context/src/atoms/ui/conditional-styles.ts and
 * packages/ai-context/src/atoms/ui/responsive-visibility.ts
 */
import type { CardBadgeVariant, FieldDateDisplayFormat } from "./component.js";
import type { StyleRule } from "../styles/style-types.js";

export type LabelPosition = "above" | "below" | "left" | "right";

export type TextColorToken =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface LabelConfig {
  readonly show?: boolean;
  readonly text?: string;
  readonly position?: LabelPosition;
  readonly bold?: boolean;
  readonly thin?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly color?: TextColorToken;
  readonly align?: "left" | "center" | "right";
}

/**
 * Shared condition kinds for `conditionalStyles` and row/column `visibleWhen`.
 * Defaults to `"field"` when omitted.
 */
export type LayoutConditionKind =
  | "field"
  | "activePath"
  | "dashboardDateFilter";

/** @deprecated Use {@link LayoutConditionKind}. */
export type ConditionalStyleConditionKind = LayoutConditionKind;

/**
 * Boolean condition shared by visibility rules and conditional style rules.
 */
export interface LayoutCondition {
  /**
   * How `matchValue` is interpreted. Defaults to `"field"` when omitted.
   * - `"field"` — entity field value (see `compareFieldPath`)
   * - `"activePath"` — current route pathname
   * - `"dashboardDateFilter"` — dashboard date filter (`currentPeriod` or exact bucket)
   */
  readonly conditionKind?: LayoutConditionKind;
  readonly matchValue: string;
  /** Entity field path to compare; defaults to the component bound field when omitted. */
  readonly compareFieldPath?: string;
  /** Date matching format for the compare field when it is a date. */
  readonly compareFieldDateFormat?: FieldDateDisplayFormat;
}

export interface ConditionalStyleRule extends LayoutCondition {
  readonly badgeVariant?: CardBadgeVariant;
  readonly styles?: readonly StyleRule[];
  /** Legacy — normalized to styles at runtime when styles is absent. */
  readonly background?: string;
  /** Legacy — normalized to styles at runtime when styles is absent. */
  readonly textColor?: string;
}

export interface ConditionalStylesCapable {
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}
