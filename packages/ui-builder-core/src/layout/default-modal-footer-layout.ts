import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import type { UiComponentKind } from "../types/component.js";
import type { UiLayoutDocument } from "../types/layout.js";

export function createDefaultModalFooterLayout(
  actionKind: Extract<UiComponentKind, "form-actions" | "wizard-actions">,
): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  return addComponentRowAt(
    layout,
    { scope: "root", columnIndex: 0 },
    createDefaultComponent(actionKind),
  );
}
