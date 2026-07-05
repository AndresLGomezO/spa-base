import type { StylePropertyKey, StyleRule } from "../styles/style-types.js";
import {
  isLayoutStyleProperty,
  filterVisualStyleRules,
} from "../types/layout-props.js";

export class StylePropsValidationError extends Error {
  constructor(
    readonly property: StylePropertyKey,
    message?: string,
  ) {
    super(
      message ??
        `Style property "${property}" belongs in LayoutProps, not StyleProps`,
    );
    this.name = "StylePropsValidationError";
  }
}

export function validateStyleProps(
  rules: readonly StyleRule[] | undefined,
): readonly StyleRule[] {
  if (!rules) {
    return [];
  }

  for (const rule of rules) {
    if (isLayoutStyleProperty(rule.property)) {
      throw new StylePropsValidationError(rule.property);
    }
  }

  return rules;
}

export function sanitizeStyleProps(
  rules: readonly StyleRule[] | undefined,
): readonly StyleRule[] {
  return filterVisualStyleRules(rules ?? []);
}
