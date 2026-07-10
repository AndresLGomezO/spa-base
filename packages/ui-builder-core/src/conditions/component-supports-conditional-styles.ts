import type { UiComponentConfig } from "../types/component.js";
import type { FieldUiComponentConfig } from "../types/component.js";
import { resolveComponentBoundFieldPath } from "../layout/resolve-component-bound-field-path.js";

export const FIELD_COMPONENTS_WITH_CONDITIONAL_STYLES = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
] as const satisfies readonly FieldUiComponentConfig["kind"][];

export type FieldComponentWithConditionalStyles =
  (typeof FIELD_COMPONENTS_WITH_CONDITIONAL_STYLES)[number];

export const ENTITY_BOUND_CONDITIONAL_STYLE_KINDS = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
  "container",
  "grid",
  "icon",
  "metric-kpi",
  "metric-derived-kpi",
  "metric-widget",
  "chart",
  "query-viewer",
  "user",
  "notification-bell",
  "form-field",
  "entity-field-selector",
  "form-section",
  "related-records",
] as const satisfies readonly UiComponentConfig["kind"][];

export type EntityBoundConditionalStyleKind =
  (typeof ENTITY_BOUND_CONDITIONAL_STYLE_KINDS)[number];

export function fieldComponentSupportsConditionalStyles(
  kind: string,
): kind is FieldComponentWithConditionalStyles {
  return (
    FIELD_COMPONENTS_WITH_CONDITIONAL_STYLES as readonly string[]
  ).includes(kind);
}

export function entityBoundComponentSupportsConditionalStyles(
  kind: string,
): kind is EntityBoundConditionalStyleKind {
  return (ENTITY_BOUND_CONDITIONAL_STYLE_KINDS as readonly string[]).includes(
    kind,
  );
}

export function resolveDefaultCompareFieldPath(
  config: UiComponentConfig,
): string | undefined {
  return resolveComponentBoundFieldPath(config);
}
