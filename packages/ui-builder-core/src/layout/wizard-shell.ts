import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import type { UiComponentKind } from "../types/component.js";
import type { ColumnNode, RowNode, UiLayoutDocument } from "../types/layout.js";

import { createDefaultWizardShellLayout } from "./default-wizard-form-layout.js";

const REQUIRED_WIZARD_SHELL_KINDS = [
  "wizard-progress",
  "wizard-step-host",
  "wizard-actions",
] as const satisfies readonly UiComponentKind[];

function walkRows(rows: readonly RowNode[], kinds: Set<UiComponentKind>): void {
  for (const row of rows) {
    if (row.type === "component") {
      kinds.add(row.component.kind);
      continue;
    }
    for (const column of row.columns) {
      walkColumn(column, kinds);
    }
  }
}

function walkColumn(column: ColumnNode, kinds: Set<UiComponentKind>): void {
  walkRows(column.rows, kinds);
}

export function collectLayoutComponentKinds(
  layout: UiLayoutDocument,
): ReadonlySet<UiComponentKind> {
  const kinds = new Set<UiComponentKind>();
  for (const column of layout.root.columns) {
    walkColumn(column, kinds);
  }
  return kinds;
}

export interface WizardShellLayoutOptions {
  readonly actionsInModalFooter?: boolean;
}

function requiredWizardShellKinds(
  options?: WizardShellLayoutOptions,
): readonly UiComponentKind[] {
  if (options?.actionsInModalFooter) {
    return ["wizard-progress", "wizard-step-host"];
  }
  return REQUIRED_WIZARD_SHELL_KINDS;
}

export function assertWizardShellLayout(
  layout: UiLayoutDocument,
  context: string,
  options?: WizardShellLayoutOptions,
): void {
  const kinds = collectLayoutComponentKinds(layout);

  for (const kind of requiredWizardShellKinds(options)) {
    if (!kinds.has(kind)) {
      throw new Error(
        `Wizard shell ${context} must include a "${kind}" component.`,
      );
    }
  }
}

/** Adds any missing wizard shell slot components without removing existing rows. */
export function ensureWizardShellLayout(
  layout: UiLayoutDocument,
  options?: WizardShellLayoutOptions,
): UiLayoutDocument {
  const requiredKinds = requiredWizardShellKinds(options);
  const kinds = collectLayoutComponentKinds(layout);
  if (requiredKinds.every((kind) => kinds.has(kind))) {
    return layout;
  }

  if (layout.root.columns.length < 2) {
    return createDefaultWizardShellLayout();
  }

  let next = layout;
  const leftLocator = { scope: "root" as const, columnIndex: 0 };
  const rightLocator = { scope: "root" as const, columnIndex: 1 };

  if (!collectLayoutComponentKinds(next).has("wizard-progress")) {
    next = addComponentRowAt(
      next,
      leftLocator,
      createDefaultComponent("wizard-progress"),
    );
  }

  if (!collectLayoutComponentKinds(next).has("wizard-step-host")) {
    next = addComponentRowAt(
      next,
      rightLocator,
      createDefaultComponent("wizard-step-host"),
    );
  }

  if (
    !options?.actionsInModalFooter &&
    !collectLayoutComponentKinds(next).has("wizard-actions")
  ) {
    next = addComponentRowAt(
      next,
      rightLocator,
      createDefaultComponent("wizard-actions"),
    );
  }

  return next;
}

export function createWizardShellLayoutWithSlots(
  columnCount = 2,
): UiLayoutDocument {
  if (columnCount < 2) {
    return createDefaultWizardShellLayout();
  }

  let layout = createEmptyLayout(columnCount);
  const leftLocator = { scope: "root" as const, columnIndex: 0 };
  const rightLocator = { scope: "root" as const, columnIndex: 1 };

  layout = addComponentRowAt(
    layout,
    leftLocator,
    createDefaultComponent("wizard-progress"),
  );
  layout = addComponentRowAt(
    layout,
    rightLocator,
    createDefaultComponent("wizard-step-host"),
  );
  layout = addComponentRowAt(
    layout,
    rightLocator,
    createDefaultComponent("wizard-actions"),
  );

  return layout;
}
