import type { UiComponentConfig } from "@repo/ui-builder-core";
import type { FieldPathValidationDefinition } from "@repo/ui-builder-core";

import {
  componentConfigKey,
  ensureLayoutTarget,
  getLayoutTargetLabel,
} from "../../layout-path.js";
import type {
  FormsUiBuilderDraft,
  SkeletonComponentSpec,
  StepValidationResult,
  SurfaceRecipe,
  UiBuilderStep,
} from "../../types.js";
import { assembleFormsSliceData } from "./forms-assembler.js";
import { validateFormFieldPaths } from "./forms-field-paths.js";
import { buildFormsStepContext } from "./forms-step-context.js";
import {
  appendNextFormsLayoutTargetIfReady,
  createSelectPresentationStep,
  expandStepsAfterFieldAllocation,
  expandStepsAfterLayoutSkeleton,
  expandStepsAfterPresentation,
  expandStepsAfterWizardStepsDefined,
  shouldSkipPresentationSelection,
} from "./forms-plan.js";
import { evaluateFormBlueprint } from "./evaluate-form-blueprint.js";
import {
  allocateFieldsDetermistically,
  isUnknownWizardStepIdError,
} from "./allocate-fields-to-steps.js";
import { translateBlueprintToWizardSteps } from "./translate-form-blueprint.js";
import { resolveWizardProgressVariantFromTheme } from "./wizard-progress-variant.js";
import {
  allocateFieldsToStepsOutputSchema,
  configureComponentOutputSchema,
  defineWizardStepsOutputSchema,
  FORMS_STEP_TYPES,
  generateBlueprintOutputSchema,
  layoutSkeletonOutputSchema,
  selectPresentationOutputSchema,
  stepTypeFromStep,
} from "./forms-steps.js";
import {
  coerceConfigureComponentOutput,
  coerceFormLayoutSkeletonOutput,
  formatConfigureComponentValidationErrors,
  formatLayoutSkeletonValidationErrors,
} from "./normalize-forms-output.js";
import { sanitizeFormComponentConfig } from "./sanitize-form-component-config.js";

function validateSkeletonFieldPaths(
  components: readonly SkeletonComponentSpec[],
  definition: FieldPathValidationDefinition,
  errors: string[],
  allowedPaths: ReadonlySet<string>,
): void {
  for (const component of components) {
    if (component.fieldPath) {
      errors.push(
        ...validateFormFieldPaths(
          [component.fieldPath],
          definition,
          "skeleton",
          allowedPaths,
        ),
      );
    }
    if (component.columns) {
      for (const column of component.columns) {
        validateSkeletonFieldPaths(
          column.components,
          definition,
          errors,
          allowedPaths,
        );
      }
    }
  }
}

export const formsSurfaceRecipe: SurfaceRecipe = {
  surface: "forms",

  createInitialSteps(context): readonly UiBuilderStep[] {
    if (
      shouldSkipPresentationSelection(
        context.formFieldPaths.length,
        context.presentationHint ?? context.formPresentation,
      )
    ) {
      const presentation =
        context.formFieldPaths.length >= 6
          ? "wizard"
          : (context.presentationHint ?? context.formPresentation ?? "wizard");
      return expandStepsAfterPresentation(presentation, {
        allowCreative: context.allowCreative,
      });
    }
    return [createSelectPresentationStep()];
  },

  buildStepContext(step, context) {
    return buildFormsStepContext(step, context);
  },

  validateStepOutput(step, rawOutput, context): StepValidationResult {
    const stepType = stepTypeFromStep(step);
    const errors: string[] = [];
    const allowedFormPaths = new Set(context.formFieldPaths);

    switch (stepType) {
      case FORMS_STEP_TYPES.SELECT_PRESENTATION: {
        const parsed = selectPresentationOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return {
            ok: false,
            errors: ["Invalid form presentation selection output."],
          };
        }
        return {
          ok: true,
          data: parsed.data,
          appendSteps: expandStepsAfterPresentation(parsed.data.presentation, {
            allowCreative: context.allowCreative,
          }),
        };
      }
      case FORMS_STEP_TYPES.GENERATE_BLUEPRINT: {
        const parsed = generateBlueprintOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return { ok: false, errors: ["Invalid form blueprint output."] };
        }
        const blueprint = parsed.data.blueprint;
        const evaluation = evaluateFormBlueprint(
          blueprint,
          context.formFieldPaths.length,
        );
        if (evaluation.reject) {
          return {
            ok: false,
            errors: [
              "Blueprint uninspired; retry with higher creativity",
              ...evaluation.reasons,
            ],
          };
        }
        const wizardSteps = translateBlueprintToWizardSteps(
          blueprint,
          context.formFieldPaths,
        );
        return {
          ok: true,
          data: {
            blueprint,
            evaluationScore: evaluation.score,
            wizardSteps,
            blueprintVisualTheme: blueprint.visualTheme,
          },
        };
      }
      case FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS: {
        const parsed = defineWizardStepsOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return { ok: false, errors: ["Invalid wizard steps output."] };
        }
        const ids = new Set<string>();
        for (const wizardStep of parsed.data.steps) {
          if (ids.has(wizardStep.id)) {
            errors.push(`Duplicate wizard step id "${wizardStep.id}"`);
          }
          ids.add(wizardStep.id);
        }
        if (errors.length > 0) {
          return { ok: false, errors };
        }
        return {
          ok: true,
          data: parsed.data,
          appendSteps: expandStepsAfterWizardStepsDefined(),
        };
      }
      case FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS: {
        const parsed = allocateFieldsToStepsOutputSchema.safeParse(rawOutput);
        if (!parsed.success) {
          return { ok: false, errors: ["Invalid field allocation output."] };
        }
        const draft = context.draft as FormsUiBuilderDraft;
        const wizardStepIds = new Set(
          (draft.wizardSteps ?? []).map((step) => step.id),
        );
        const assigned = new Set<string>();
        for (const step of parsed.data.steps) {
          if (wizardStepIds.size > 0 && !wizardStepIds.has(step.id)) {
            errors.push(`Unknown wizard step id "${step.id}"`);
          }
          if (step.fieldPaths.length > 4) {
            errors.push(`Step "${step.id}" has more than 4 fields`);
          }
          for (const fieldPath of step.fieldPaths) {
            if (assigned.has(fieldPath)) {
              errors.push(`Field "${fieldPath}" assigned to multiple steps`);
            }
            assigned.add(fieldPath);
          }
          errors.push(
            ...validateFormFieldPaths(
              step.fieldPaths,
              context.fieldPathDefinition,
              `step ${step.id}`,
              allowedFormPaths,
            ),
          );
        }
        const unassigned = context.formFieldPaths.filter(
          (path) => !assigned.has(path),
        );
        if (unassigned.length > 0 && parsed.data.steps.length > 1) {
          const lastStep = parsed.data.steps[parsed.data.steps.length - 1];
          if (lastStep && lastStep.fieldPaths.length === 0) {
            // review-only final step may omit fields
          } else if (unassigned.length > context.formFieldPaths.length / 2) {
            errors.push(
              `Unassigned form fields: ${unassigned.slice(0, 5).join(", ")}`,
            );
          }
        }

        const unknownIdErrors = errors.filter(isUnknownWizardStepIdError);
        if (
          unknownIdErrors.length > 0 &&
          unknownIdErrors.length === errors.length &&
          (draft.wizardSteps?.length ?? 0) > 0
        ) {
          const fallbackSteps = allocateFieldsDetermistically(
            draft.wizardSteps!,
            context.formFieldPaths,
          );
          return {
            ok: true,
            data: {
              steps: fallbackSteps.map((step) => ({
                id: step.id,
                label: step.label,
                fieldPaths: [...(step.fieldPaths ?? [])],
              })),
              usedDeterministicFallback: true,
            },
          };
        }

        if (errors.length > 0) {
          return { ok: false, errors };
        }
        return {
          ok: true,
          data: parsed.data,
          appendSteps: expandStepsAfterFieldAllocation(),
        };
      }
      case FORMS_STEP_TYPES.LAYOUT_SKELETON: {
        const coerced = coerceFormLayoutSkeletonOutput(rawOutput);
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
          allowedFormPaths,
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
      case FORMS_STEP_TYPES.CONFIGURE_COMPONENT: {
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
            component: sanitizeFormComponentConfig(
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
    const formsDraft = draft as FormsUiBuilderDraft;
    const stepType = stepTypeFromStep(step);

    switch (stepType) {
      case FORMS_STEP_TYPES.SELECT_PRESENTATION: {
        const output = data as {
          presentation: FormsUiBuilderDraft["presentation"];
        };
        return { ...formsDraft, presentation: output.presentation };
      }
      case FORMS_STEP_TYPES.GENERATE_BLUEPRINT: {
        const output = data as {
          blueprint: import("./forms-blueprint.schema.js").FormBlueprint;
          wizardSteps: FormsUiBuilderDraft["wizardSteps"];
          blueprintVisualTheme?: string;
        };
        const progressVariant = resolveWizardProgressVariantFromTheme(
          output.blueprintVisualTheme ?? output.blueprint.visualTheme,
        );
        return {
          ...formsDraft,
          creativeMode: true,
          formBlueprint: output.blueprint,
          presentation:
            output.blueprint.presentation === "wizard"
              ? "wizard"
              : formsDraft.presentation,
          wizardSteps: output.wizardSteps ? [...output.wizardSteps] : [],
          ...(output.blueprintVisualTheme
            ? { blueprintVisualTheme: output.blueprintVisualTheme }
            : {}),
          ...(progressVariant
            ? { wizardProgressVariant: progressVariant }
            : {}),
        };
      }
      case FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS: {
        const output = data as {
          steps: FormsUiBuilderDraft["wizardSteps"];
        };
        return {
          ...formsDraft,
          wizardSteps: output.steps ? [...output.steps] : [],
        };
      }
      case FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS: {
        const output = data as {
          steps: Array<{
            id: string;
            label: string;
            fieldPaths: readonly string[];
          }>;
        };
        return {
          ...formsDraft,
          wizardSteps: output.steps.map((step) => ({
            id: step.id,
            label: step.label,
            fieldPaths: [...step.fieldPaths],
          })),
        };
      }
      case FORMS_STEP_TYPES.LAYOUT_SKELETON: {
        const output = data as {
          pathKey: string;
          components: SkeletonComponentSpec[];
        };
        const existing = ensureLayoutTarget(formsDraft, output.pathKey);
        return {
          ...formsDraft,
          layoutTargets: {
            ...formsDraft.layoutTargets,
            [output.pathKey]: {
              ...existing,
              label: getLayoutTargetLabel(output.pathKey),
              skeleton: output.components,
            },
          },
        };
      }
      case FORMS_STEP_TYPES.CONFIGURE_COMPONENT: {
        const output = data as { component: UiComponentConfig };
        const pathKey = String(step.payload?.pathKey ?? "");
        const componentPath = String(step.payload?.componentPath ?? "");
        const existing = ensureLayoutTarget(formsDraft, pathKey);
        return {
          ...formsDraft,
          layoutTargets: {
            ...formsDraft.layoutTargets,
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
        return formsDraft;
    }
  },

  assembleFinalOutput(draft, context) {
    void context;
    return draft;
  },

  appendStepsAfterMerge(step, draft, validationAppendSteps) {
    const formsDraft = draft as FormsUiBuilderDraft;
    if (step.type === FORMS_STEP_TYPES.CONFIGURE_COMPONENT) {
      const extra = appendNextFormsLayoutTargetIfReady(formsDraft);
      return [...validationAppendSteps, ...extra];
    }
    if (step.type === FORMS_STEP_TYPES.LAYOUT_SKELETON) {
      return validationAppendSteps;
    }
    return validationAppendSteps;
  },
};

export { assembleFormsSliceData };
