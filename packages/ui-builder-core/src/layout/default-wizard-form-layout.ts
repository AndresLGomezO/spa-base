import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import { createLayoutId } from "../builder/id.js";
import type { UiLayoutDocument } from "../types/layout.js";

export function createDefaultWizardShellLayout(): UiLayoutDocument {
  const layout = createEmptyLayout(2);
  const leftLocator = { scope: "root" as const, columnIndex: 0 };
  const rightLocator = { scope: "root" as const, columnIndex: 1 };

  let next = addComponentRowAt(
    layout,
    leftLocator,
    createDefaultComponent("wizard-progress"),
  );
  next = addComponentRowAt(
    next,
    rightLocator,
    createDefaultComponent("wizard-step-host"),
  );
  next = addComponentRowAt(
    next,
    rightLocator,
    createDefaultComponent("wizard-actions"),
  );

  return next;
}

export function createDefaultWizardStepLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  let layout = createEmptyLayout(1);
  const locator = { scope: "root" as const, columnIndex: 0 };

  if (fieldPaths.length > 0) {
    for (const fieldPath of fieldPaths) {
      layout = addComponentRowAt(
        layout,
        locator,
        createDefaultComponent("form-field", fieldPath),
      );
    }
    return layout;
  }

  return addComponentRowAt(
    layout,
    locator,
    createDefaultComponent("form-field", "name"),
  );
}

export function createDefaultWizardSummaryStepLayout(): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  const locator = { scope: "root" as const, columnIndex: 0 };

  return addComponentRowAt(layout, locator, {
    kind: "form-section",
    title: "Review your information",
  });
}

export function createDefaultWizardFormConfig(fieldPaths: readonly string[]): {
  shellLayout: UiLayoutDocument;
  steps: readonly [
    {
      id: string;
      label: string;
      layout: UiLayoutDocument;
    },
  ];
} {
  return {
    shellLayout: createDefaultWizardShellLayout(),
    steps: [
      {
        id: createLayoutId("step"),
        label: "Step 1",
        layout: createDefaultWizardStepLayout(fieldPaths),
      },
    ],
  };
}
