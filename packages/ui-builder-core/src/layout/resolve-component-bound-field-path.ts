import {
  isFieldUiComponent,
  type UiComponentConfig,
} from "../types/component.js";

/** Field path bound on a component row, when applicable. */
export function resolveComponentBoundFieldPath(
  config: UiComponentConfig,
): string | undefined {
  if (isFieldUiComponent(config) && config.primary.type === "field") {
    return config.primary.path;
  }

  if (config.kind === "form-field") {
    return config.fieldPath;
  }

  return undefined;
}
