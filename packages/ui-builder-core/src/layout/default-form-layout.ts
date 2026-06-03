import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import type { UiLayoutDocument } from "../types/layout.js";

/** Default form layout: one form-field per path in a single column. */
export function createDefaultFormLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  let layout = createEmptyLayout(1);
  const locator = { scope: "root" as const, columnIndex: 0 };

  for (const fieldPath of fieldPaths) {
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("form-field", fieldPath),
    );
  }

  return layout;
}
