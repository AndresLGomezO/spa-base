/**
 * @ai-context-sync
 * LabelConfig — keep in sync with packages/ai-context/src/atoms/ui/label-config.ts
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

export type ConditionalStyleConditionKind = "field" | "activePath";

export interface ConditionalStyleRule {
  /**
   * How `matchValue` is interpreted. Defaults to `"field"` when omitted.
   * `"activePath"` compares against the current route pathname (see `isActivePathMatch`).
   */
  readonly conditionKind?: ConditionalStyleConditionKind;
  readonly matchValue: string;
  /** Entity field path to compare; defaults to the component bound field when omitted. */
  readonly compareFieldPath?: string;
  /** Date matching format for the compare field when it is a date. */
  readonly compareFieldDateFormat?: FieldDateDisplayFormat;
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
