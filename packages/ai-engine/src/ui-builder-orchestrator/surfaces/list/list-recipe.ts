import type { UiComponentConfig } from "@repo/ui-builder-core";
import type { FieldPathValidationDefinition } from "@repo/ui-builder-core";

import {
  componentConfigKey,
  ensureLayoutTarget,
  getLayoutTargetLabel,
} from "../../layout-path.js";
import type {
  ListUiBuilderDraft,
  SkeletonComponentSpec,
  StepValidationResult,
  SurfaceRecipe,
  UiBuilderStep,
} from "../../types.js";
import { assembleListSliceData } from "./list-assembler.js";
import {
  normalizeTableFieldOutput,
  validateLayoutFieldPaths,
  validateTableFieldPaths,
} from "./list-field-paths.js";
import { sanitizeTableFields } from "./list-slice-companions.js";
import { buildListStepContext } from "./list-step-context.js";
import {
  appendNextExpandableSkeletonIfReady,
  createSelectViewTypeStep,
  expandStepsAfterExpandableColumns,
  expandStepsAfterLayoutSkeleton,
  expandStepsAfterViewType,
} from "./list-plan.js";
import {
  configureComponentOutputSchema,
  expandableDefineColumnsOutputSchema,
  layoutSkeletonOutputSchema,
  LIST_STEP_TYPES,
  selectViewTypeOutputSchema,
  stepTypeFromStep,
  tableSelectFieldsOutputSchema,
} from "./list-steps.js";
import {
  coerceLayoutSkeletonOutput,
  formatLayoutSkeletonValidationErrors,
} from "./normalize-layout-skeleton-output.js";
import {
  coerceConfigureComponentOutput,
  formatConfigureComponentValidationErrors,
} from "./normalize-configure-component-output.js";
import { sanitizeListComponentConfig } from "./sanitize-list-component-config.js";

function validateSkeletonFieldPaths(
  components: readonly SkeletonComponentSpec[],
  definition: FieldPathValidationDefinition,
  errors: string[],
): void {
  for (const component of components) {
    if (component.fieldPath) {
      errors.push(
        ...validateLayoutFieldPaths(
          [component.fieldPath],
          definition,
          "skeleton",
        ),
      );
    }
    if (component.columns) {
      for (const column of component.columns) {
        validateSkeletonFieldPaths(column.components, definition, errors);
      }
    }
  }
}

export const listSurfaceRecipe: SurfaceRecipe = {
  surface: "list",

  createInitialSteps(): readonly UiBuilderStep[] {
    return [createSelectViewTypeStep()];
  },

  buildStepContext(step, context) {
    return buildListStepContext(step, context);
  },

  validateStepOutput(step, rawOutput, context): StepValidationResult {
    const stepType = stepTypeFromStep(step);
    const errors: string[] = [];

    switch (stepType) {
      case LIST_STEP_TYPES.SELECT_VIEW_TYPE: {
        const parsed = selectViewTypeOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return {
            ok: false,
            errors: ["Invalid listViewType selection output."],
          };
        }
        return {
          ok: true,
          data: parsed.data,
          appendSteps: expandStepsAfterViewType(parsed.data.listViewType),
        };
      }
      case LIST_STEP_TYPES.TABLE_SELECT_FIELDS: {
        const parsed = tableSelectFieldsOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return { ok: false, errors: ["Invalid table fields output."] };
        }
        const normalizedFields = normalizeTableFieldOutput(
          context.fieldPathDefinition,
          parsed.data.fields,
        );
        errors.push(
          ...validateTableFieldPaths(
            normalizedFields,
            context.fieldPathDefinition,
            "table.fields",
            new Set(context.tableFieldPaths),
          ),
        );
        if (errors.length > 0) {
          return { ok: false, errors };
        }
        return {
          ok: true,
          data: {
            ...parsed.data,
            fields: [...normalizedFields],
          },
        };
      }
      case LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS: {
        const parsed = expandableDefineColumnsOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return { ok: false, errors: ["Invalid expandable columns output."] };
        }
        const ids = new Set<string>();
        for (const column of parsed.data.columns) {
          if (ids.has(column.id)) {
            errors.push(`Duplicate column id "${column.id}"`);
          }
          ids.add(column.id);
          if (column.summaryField) {
            errors.push(
              ...validateLayoutFieldPaths(
                [column.summaryField],
                context.fieldPathDefinition,
                `column.${column.id}.summaryField`,
                new Set(context.layoutFieldPaths),
              ),
            );
          }
        }
        if (errors.length > 0) {
          return { ok: false, errors };
        }
        return {
          ok: true,
          data: parsed.data,
          appendSteps: [
            expandStepsAfterExpandableColumns(parsed.data.columns.length)[0]!,
          ],
        };
      }
      case LIST_STEP_TYPES.LAYOUT_SKELETON: {
        const coerced = coerceLayoutSkeletonOutput(rawOutput);
        const parsed = layoutSkeletonOutputSchema.safeParse(coerced);
        if (!parsed.success) {
          return {
            ok: false,
            errors:
              coerced.components.length === 0
                ? [
                    "Invalid layout skeleton output: expected { components: [...] } with kind and fieldPath only.",
                    ...formatLayoutSkeletonValidationErrors(
                      parsed.error.issues,
                    ),
                  ]
                : formatLayoutSkeletonValidationErrors(parsed.error.issues),
          };
        }
        validateSkeletonFieldPaths(
          parsed.data.components as SkeletonComponentSpec[],
          context.fieldPathDefinition,
          errors,
        );
        if (errors.length > 0) {
          return { ok: false, errors };
        }
        const pathKey = String(step.payload?.pathKey ?? "");
        return {
          ok: true,
          data: { ...parsed.data, pathKey },
          appendSteps: expandStepsAfterLayoutSkeleton(
            pathKey,
            parsed.data.components as SkeletonComponentSpec[],
          ),
        };
      }
      case LIST_STEP_TYPES.CONFIGURE_COMPONENT: {
        const coerced = coerceConfigureComponentOutput(rawOutput);
        const parsed = configureComponentOutputSchema.safeParse(
          coerced ?? rawOutput,
        );
        if (!parsed.success) {
          return {
            ok: false,
            errors: coerced
              ? formatConfigureComponentValidationErrors(parsed.error.issues)
              : [
                  'Invalid component configuration output: expected { "component": { "kind", ... } } or a bare component object with "kind".',
                ],
          };
        }
        const expectedKind = String(step.payload?.kind ?? "");
        const component = parsed.data.component as unknown as UiComponentConfig;
        if (
          !component ||
          typeof component !== "object" ||
          !("kind" in component)
        ) {
          return {
            ok: false,
            errors: ["Component must include a kind property."],
          };
        }
        const actualKind = String(component.kind);
        if (actualKind !== expectedKind) {
          return {
            ok: false,
            errors: [
              `Expected component kind "${expectedKind}" but got "${actualKind}".`,
            ],
          };
        }
        const fieldPath =
          typeof step.payload?.fieldPath === "string"
            ? step.payload.fieldPath
            : "name";
        return {
          ok: true,
          data: {
            component: sanitizeListComponentConfig(
              expectedKind,
              fieldPath,
              component,
            ),
          },
        };
      }
      default:
        return { ok: false, errors: [`Unknown step type: ${step.type}`] };
    }
  },

  mergeStepIntoDraft(step, data, draft, appendSteps = []) {
    void appendSteps;
    const listDraft = draft as ListUiBuilderDraft;
    const stepType = stepTypeFromStep(step);

    switch (stepType) {
      case LIST_STEP_TYPES.SELECT_VIEW_TYPE: {
        const output = data as {
          listViewType: ListUiBuilderDraft["listViewType"];
        };
        return { ...listDraft, listViewType: output.listViewType };
      }
      case LIST_STEP_TYPES.TABLE_SELECT_FIELDS: {
        const output = data as { fields: string[]; showActions?: boolean };
        return {
          ...listDraft,
          table: {
            fields: [...output.fields],
            ...(output.showActions !== undefined
              ? { showActions: output.showActions }
              : {}),
          },
        };
      }
      case LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS: {
        const output = data as {
          columns: ListUiBuilderDraft["expandableColumns"];
          showActions?: boolean;
        };
        return {
          ...listDraft,
          expandableColumns: output.columns ? [...output.columns] : [],
          ...(output.showActions !== undefined
            ? { showActions: output.showActions }
            : {}),
        };
      }
      case LIST_STEP_TYPES.LAYOUT_SKELETON: {
        const output = data as {
          pathKey: string;
          components: SkeletonComponentSpec[];
        };
        const existing = ensureLayoutTarget(listDraft, output.pathKey);
        return {
          ...listDraft,
          layoutTargets: {
            ...listDraft.layoutTargets,
            [output.pathKey]: {
              ...existing,
              label: getLayoutTargetLabel(output.pathKey),
              skeleton: output.components,
            },
          },
        };
      }
      case LIST_STEP_TYPES.CONFIGURE_COMPONENT: {
        const output = data as { component: UiComponentConfig };
        const pathKey = String(step.payload?.pathKey ?? "");
        const componentPath = String(step.payload?.componentPath ?? "");
        const existing = ensureLayoutTarget(listDraft, pathKey);
        return {
          ...listDraft,
          layoutTargets: {
            ...listDraft.layoutTargets,
            [pathKey]: {
              ...existing,
              componentConfigs: {
                ...existing.componentConfigs,
                [componentConfigKey(componentPath)]: output.component,
              },
            },
          },
        };
      }
      default:
        return listDraft;
    }
  },

  assembleFinalOutput(draft, context) {
    void context;
    return draft;
  },

  appendStepsAfterMerge(step, draft, validationAppendSteps) {
    const listDraft = draft as ListUiBuilderDraft;
    if (step.type === LIST_STEP_TYPES.CONFIGURE_COMPONENT) {
      const extra = appendNextExpandableSkeletonIfReady(listDraft);
      return [...validationAppendSteps, ...extra];
    }
    if (step.type === LIST_STEP_TYPES.LAYOUT_SKELETON) {
      return validationAppendSteps;
    }
    return validationAppendSteps;
  },
};

export { sanitizeTableFields, assembleListSliceData };
