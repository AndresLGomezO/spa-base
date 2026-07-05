import type { ZodError } from "zod";

import {
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
} from "../layout/layout-root-adapters.js";
import {
  columnNodeSchema,
  componentRowSchema,
  uiLayoutDocumentSchema,
} from "../schema/ui-layout-schema.js";
import {
  assertWizardShellLayout,
  collectLayoutComponentKinds,
} from "../layout/wizard-shell.js";
import type { DesignSurface } from "../types/design-surface.js";
import {
  componentKindsForSurface,
  isComponentKindAllowedOnSurface,
} from "../types/design-surface.js";
import type {
  ColumnNode,
  ComponentRowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import type { UiComponentKind } from "../types/component.js";
import { normalizeLayout } from "../builder/mutations.js";

import {
  assertFormLayoutFieldPaths,
  assertLayoutFieldPaths,
  type FieldPathValidationDefinition,
} from "./field-paths.js";
import {
  regenerateComponentRowSubtree,
  regenerateLayoutDocumentIds,
} from "./regenerate-layout-ids.js";
import {
  StylePropsValidationError,
  validateStyleProps,
} from "./validate-style-props.js";

export type LayoutJsonImportScope =
  | { readonly type: "layout-document" }
  | { readonly type: "column" }
  | { readonly type: "component-row" }
  | { readonly type: "insertable-row" };

export interface LayoutJsonImportError {
  readonly path: string;
  readonly message: string;
}

export interface LayoutJsonImportValidationResult {
  readonly ok: boolean;
  readonly data?: UiLayoutDocument | ColumnNode | ComponentRowNode;
  readonly errors: readonly LayoutJsonImportError[];
}

export interface ValidateLayoutJsonImportOptions {
  readonly designSurface: DesignSurface;
  readonly definition: FieldPathValidationDefinition;
  /** When true, wizard shell layout may omit wizard-actions (actions live in modal footer). */
  readonly actionsInModalFooter?: boolean;
}

function zodErrorsToImportErrors(error: ZodError): LayoutJsonImportError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

function isFormFieldPathSurface(surface: DesignSurface): boolean {
  return (
    surface === "formPlain" ||
    surface === "formCreate" ||
    surface === "formEdit" ||
    surface === "formWizardStep"
  );
}

function assertSurfaceComponentKinds(
  layout: UiLayoutDocument,
  surface: DesignSurface,
): LayoutJsonImportError[] {
  const errors: LayoutJsonImportError[] = [];

  for (const kind of collectLayoutComponentKinds(layout)) {
    if (!isComponentKindAllowedOnSurface(kind, surface)) {
      errors.push({
        path: "component.kind",
        message: `Component kind "${kind}" is not allowed on surface "${surface}".`,
      });
    }
  }

  return errors;
}

function assertLayoutFieldPathSemantics(
  layout: UiLayoutDocument,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportError[] {
  const errors: LayoutJsonImportError[] = [];
  const context = options.designSurface;

  try {
    if (isFormFieldPathSurface(options.designSurface)) {
      assertFormLayoutFieldPaths(options.definition, layout, context);
    } else {
      assertLayoutFieldPaths(options.definition, layout, context);
    }
  } catch (error) {
    errors.push({
      path: "fieldPath",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return errors;
}

function assertWizardShellSemantics(
  layout: UiLayoutDocument,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportError[] {
  if (options.designSurface !== "formWizardShell") {
    return [];
  }

  try {
    assertWizardShellLayout(layout, options.designSurface, {
      actionsInModalFooter: options.actionsInModalFooter,
    });
    return [];
  } catch (error) {
    return [
      {
        path: "wizardShell",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function assertEntityLayoutSemantics(
  layout: UiLayoutDocument,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportError[] {
  return [
    ...assertLayoutFieldPathSemantics(layout, options),
    ...assertWizardShellSemantics(layout, options),
  ];
}

function assertImportRowSemantics(
  row: ComponentRowNode,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportError[] {
  const wrapped = wrapRowInLayoutDocument(row);
  return [
    ...assertSurfaceComponentKinds(wrapped, options.designSurface),
    ...assertLayoutFieldPathSemantics(wrapped, options),
  ];
}

function wrapRowInLayoutDocument(row: ComponentRowNode): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  const column = resolveLayoutRootColumns(layout)[0];
  if (!column) {
    return layout;
  }

  return {
    ...layout,
    root: {
      ...asEditableLayoutRoot(layout.root),
      columns: [{ ...column, rows: [row] }],
    },
  };
}

function postProcessLayoutDocument(
  layout: UiLayoutDocument,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportValidationResult {
  const migrated = normalizeLayout(layout);
  const semanticErrors = [
    ...assertSurfaceComponentKinds(migrated, options.designSurface),
    ...assertEntityLayoutSemantics(migrated, options),
  ];

  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors };
  }

  try {
    validateStyleProps(migrated.root.styles);
  } catch (error) {
    if (error instanceof StylePropsValidationError) {
      return {
        ok: false,
        errors: [
          {
            path: "root.styles",
            message: error.message,
          },
        ],
      };
    }
    throw error;
  }

  return {
    ok: true,
    data: regenerateLayoutDocumentIds(migrated),
    errors: [],
  };
}

function postProcessComponentRow(
  row: ComponentRowNode,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportValidationResult {
  const semanticErrors = assertImportRowSemantics(row, options);

  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors };
  }

  return {
    ok: true,
    data: regenerateComponentRowSubtree(row),
    errors: [],
  };
}

function isInsertableRowJson(value: unknown): value is ComponentRowNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "component"
  );
}

export function validateLayoutJsonImport(
  raw: string,
  scope: LayoutJsonImportScope,
  options: ValidateLayoutJsonImportOptions,
): LayoutJsonImportValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "(parse)",
          message: error instanceof Error ? error.message : "Invalid JSON",
        },
      ],
    };
  }

  if (scope.type === "layout-document") {
    const result = uiLayoutDocumentSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, errors: zodErrorsToImportErrors(result.error) };
    }
    return postProcessLayoutDocument(result.data as UiLayoutDocument, options);
  }

  if (scope.type === "column") {
    const result = columnNodeSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, errors: zodErrorsToImportErrors(result.error) };
    }
    return {
      ok: true,
      data: result.data as ColumnNode,
      errors: [],
    };
  }

  if (scope.type === "component-row" || scope.type === "insertable-row") {
    if (scope.type === "insertable-row" && !isInsertableRowJson(parsed)) {
      return {
        ok: false,
        errors: [
          {
            path: "type",
            message: 'Expected a component row ("type": "component").',
          },
        ],
      };
    }

    const result = componentRowSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, errors: zodErrorsToImportErrors(result.error) };
    }
    return postProcessComponentRow(result.data as ComponentRowNode, options);
  }

  return {
    ok: false,
    errors: [{ path: "(scope)", message: "Unsupported import scope." }],
  };
}

function defaultKindForSurface(surface: DesignSurface): UiComponentKind {
  return componentKindsForSurface(surface)[0] ?? "text";
}

export function createLayoutJsonSkeleton(
  scope: LayoutJsonImportScope,
  designSurface: DesignSurface,
  defaultFieldPath: string,
  referenceData?: UiLayoutDocument | ColumnNode | ComponentRowNode,
): string {
  if (referenceData !== undefined) {
    if (
      scope.type === "layout-document" &&
      "root" in referenceData &&
      referenceData.root.type === "root"
    ) {
      return JSON.stringify(referenceData, null, 2);
    }
    if (
      scope.type === "column" &&
      "rows" in referenceData &&
      !("type" in referenceData)
    ) {
      return JSON.stringify(referenceData, null, 2);
    }
    if (
      (scope.type === "component-row" || scope.type === "insertable-row") &&
      "type" in referenceData &&
      referenceData.type === "component"
    ) {
      return JSON.stringify(referenceData, null, 2);
    }
  }

  const kind =
    scope.type === "layout-document"
      ? defaultKindForSurface(designSurface)
      : "text";

  if (scope.type === "layout-document") {
    const layout = createEmptyLayout(1);
    const column = resolveLayoutRootColumns(layout)[0];
    const document =
      column === undefined
        ? layout
        : {
            ...layout,
            root: {
              ...asEditableLayoutRoot(layout.root),
              columns: [
                {
                  ...column,
                  rows: [
                    {
                      type: "component" as const,
                      id: "row-example",
                      component: createDefaultComponent(kind, defaultFieldPath),
                    },
                  ],
                },
              ],
            },
          };
    return JSON.stringify(document, null, 2);
  }

  if (scope.type === "column") {
    const column = resolveLayoutRootColumns(createEmptyLayout(1))[0];
    if (column === undefined) {
      return JSON.stringify({ id: "col-example", rows: [] }, null, 2);
    }
    return JSON.stringify(
      {
        ...column,
        rows: [
          {
            type: "component" as const,
            id: "row-example",
            component: createDefaultComponent(kind, defaultFieldPath),
          },
        ],
      },
      null,
      2,
    );
  }

  const row: ComponentRowNode = {
    type: "component",
    id: "row-example",
    component: createDefaultComponent(kind, defaultFieldPath),
  };
  return JSON.stringify(row, null, 2);
}
