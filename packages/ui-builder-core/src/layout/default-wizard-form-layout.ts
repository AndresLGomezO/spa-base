import {
  addComponentRowAt,
  createDefaultComponent,
  insertGridRowAt,
  resolveGridTrackLocators,
} from "../builder/mutations.js";
import { createLayoutId } from "../builder/id.js";
import type { UiLayoutDocument } from "../types/layout.js";
import { beginContainerRootLayout } from "./ensure-container-root.js";

export function createDefaultWizardShellLayout(): UiLayoutDocument {
  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
    beganLayout,
    containerLocator,
    { position: "after" },
    {
      trackCount: 2,
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
    },
  );

  const [leftLocator, rightLocator] = resolveGridTrackLocators(
    withGrid,
    containerLocator,
    gridRowId,
  );
  if (!leftLocator || !rightLocator) {
    return withGrid;
  }

  let next = addComponentRowAt(
    withGrid,
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
  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  let layout = beganLayout;

  if (fieldPaths.length > 0) {
    for (const fieldPath of fieldPaths) {
      layout = addComponentRowAt(
        layout,
        containerLocator,
        createDefaultComponent("form-field", fieldPath),
      );
    }
    return layout;
  }

  return addComponentRowAt(
    layout,
    containerLocator,
    createDefaultComponent("form-field", "name"),
  );
}

export function createDefaultWizardSummaryStepLayout(): UiLayoutDocument {
  const { layout, containerLocator } = beginContainerRootLayout();

  return addComponentRowAt(layout, containerLocator, {
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
