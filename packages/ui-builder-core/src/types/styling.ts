import type { CardBadgeVariant } from "./component.js";

export type LabelPosition = "above" | "below";

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

export interface ConditionalStyleRule {
  readonly matchValue: string;
  readonly background?: TextColorToken;
  readonly textColor?: TextColorToken;
  readonly badgeVariant?: CardBadgeVariant;
}
