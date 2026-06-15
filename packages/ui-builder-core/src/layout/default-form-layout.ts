import {
  addComponentRowAt,
  createDefaultComponent,
} from "../builder/mutations.js";
import type { UiLayoutDocument } from "../types/layout.js";
import { beginContainerRootLayout } from "./ensure-container-root.js";

/** Default form layout: one form-field per path inside the root container. */
export function createDefaultFormLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  let layout = beganLayout;

  for (const fieldPath of fieldPaths) {
    layout = addComponentRowAt(
      layout,
      containerLocator,
      createDefaultComponent("form-field", fieldPath),
    );
  }

  layout = addComponentRowAt(
    layout,
    containerLocator,
    createDefaultComponent("form-actions"),
  );

  return layout;
}
