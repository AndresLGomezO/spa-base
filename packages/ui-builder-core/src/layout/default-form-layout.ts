import { applyBuiltInTemplate } from "../presets/apply-built-in-template.js";
import type { UiLayoutDocument } from "../types/layout.js";

/** Default form layout: delegates to the global plain-form preset. */
export function createDefaultFormLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  return applyBuiltInTemplate("plain-form", { fieldPaths });
}
