import { isFieldVisible } from "@repo/ui-builder";
import type {
  FieldAccessLevel,
  SerializableEntityDefinition,
} from "@repo/entities";
import {
  collectLayoutInputFieldPaths,
  isRowHolderComponent,
  type ColumnNode,
  type RowNode,
  type UiComponentConfig,
  type UiLayoutDocument,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";

import { getFieldAccessLevel } from "../../hooks/useFieldAccess";
import { fieldPathRoot } from "./validate-wizard-step-fields";

interface CollectRenderedFieldRootsOptions {
  readonly definition: SerializableEntityDefinition;
  readonly fieldAccess: Readonly<Record<string, FieldAccessLevel>>;
  readonly canRead: boolean;
  readonly roots: Set<string>;
}

function collectRenderedRootFromComponent(
  component: UiComponentConfig,
  options: CollectRenderedFieldRootsOptions,
): void {
  if (
    component.kind !== "form-field" &&
    component.kind !== "entity-field-selector"
  ) {
    return;
  }

  if (component.hidden === true) {
    return;
  }

  const root = fieldPathRoot(component.fieldPath);
  const fieldUI = options.definition.ui.fields?.[root];
  const access = getFieldAccessLevel(options.fieldAccess, root);
  if (!isFieldVisible(fieldUI, options.canRead, access)) {
    return;
  }

  options.roots.add(root);
}

function walkRows(
  rows: readonly RowNode[],
  options: CollectRenderedFieldRootsOptions,
): void {
  for (const row of rows) {
    const component = row.component;
    if (isRowHolderComponent(component)) {
      walkRows(component.rows, options);
      continue;
    }

    collectRenderedRootFromComponent(component, options);
  }
}

function walkColumn(
  column: ColumnNode,
  options: CollectRenderedFieldRootsOptions,
): void {
  walkRows(column.rows, options);
}

export function collectFormRenderedFieldRoots(options: {
  readonly layouts: readonly UiLayoutDocument[];
  readonly definition: SerializableEntityDefinition;
  readonly fieldAccess: Readonly<Record<string, FieldAccessLevel>>;
  readonly canRead: boolean;
}): ReadonlySet<string> {
  const roots = new Set<string>();
  const walkOptions: CollectRenderedFieldRootsOptions = {
    definition: options.definition,
    fieldAccess: options.fieldAccess,
    canRead: options.canRead,
    roots,
  };

  for (const layout of options.layouts) {
    for (const column of resolveLayoutRootColumns(layout)) {
      walkColumn(column, walkOptions);
    }
  }

  return roots;
}

export function collectOrphanFieldErrors(
  fieldErrors: Readonly<Record<string, string | undefined>>,
  renderedRoots: ReadonlySet<string>,
): Record<string, string> {
  const orphanErrors: Record<string, string> = {};

  for (const [fieldName, message] of Object.entries(fieldErrors)) {
    if (message && !renderedRoots.has(fieldName)) {
      orphanErrors[fieldName] = message;
    }
  }

  return orphanErrors;
}

export function findWizardStepIndexForFieldRoot(
  steps: ReadonlyArray<{ readonly layout: UiLayoutDocument }>,
  fieldRoot: string,
): number | null {
  for (const [index, step] of steps.entries()) {
    for (const fieldPath of collectLayoutInputFieldPaths(step.layout)) {
      if (fieldPathRoot(fieldPath) === fieldRoot) {
        return index;
      }
    }
  }

  return null;
}
