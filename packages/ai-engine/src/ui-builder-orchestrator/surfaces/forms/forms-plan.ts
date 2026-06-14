import { MAX_NESTED_DEPTH, WIZARD_FIELD_THRESHOLD } from "../../limits.js";
import { componentConfigKey } from "../../layout-path.js";
import type {
  FormsUiBuilderDraft,
  SkeletonComponentSpec,
  UiBuilderStep,
} from "../../types.js";
import { FORMS_STEP_TYPES } from "./forms-steps.js";

export function shouldSkipPresentationSelection(
  formFieldCount: number,
  presentationHint?: FormsUiBuilderDraft["presentation"],
): boolean {
  if (formFieldCount >= WIZARD_FIELD_THRESHOLD) {
    return true;
  }
  return presentationHint === "wizard";
}

export function createSelectPresentationStep(): UiBuilderStep {
  return {
    id: FORMS_STEP_TYPES.SELECT_PRESENTATION,
    type: FORMS_STEP_TYPES.SELECT_PRESENTATION,
    label: "Selecting form presentation",
    phase: "selection",
  };
}

export function createGenerateBlueprintStep(): UiBuilderStep {
  return {
    id: FORMS_STEP_TYPES.GENERATE_BLUEPRINT,
    type: FORMS_STEP_TYPES.GENERATE_BLUEPRINT,
    label: "Generating form blueprint",
    phase: "concept",
  };
}

export function createDefineWizardStepsStep(): UiBuilderStep {
  return {
    id: FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS,
    type: FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS,
    label: "Defining wizard steps",
    phase: "wizard",
  };
}

export function createAllocateFieldsToStepsStep(): UiBuilderStep {
  return {
    id: FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
    type: FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
    label: "Allocating fields to wizard steps",
    phase: "wizard",
  };
}

export function createLayoutSkeletonStep(pathKey: string): UiBuilderStep {
  return {
    id: `${FORMS_STEP_TYPES.LAYOUT_SKELETON}:${pathKey}`,
    type: FORMS_STEP_TYPES.LAYOUT_SKELETON,
    label: `Designing layout skeleton (${pathKey})`,
    phase: "layout",
    payload: { pathKey },
  };
}

export function createConfigureComponentStep(
  pathKey: string,
  componentPath: string,
  kind: string,
  fieldPath?: string,
): UiBuilderStep {
  return {
    id: `${FORMS_STEP_TYPES.CONFIGURE_COMPONENT}:${pathKey}:${componentPath}`,
    type: FORMS_STEP_TYPES.CONFIGURE_COMPONENT,
    label: `Configuring ${kind} component`,
    phase: "component",
    payload: {
      pathKey,
      componentPath,
      kind,
      ...(fieldPath ? { fieldPath } : {}),
    },
  };
}

export function expandStepsAfterPresentation(
  presentation: FormsUiBuilderDraft["presentation"],
  options?: { readonly allowCreative?: boolean },
): UiBuilderStep[] {
  if (presentation === "plain") {
    return [createLayoutSkeletonStep("plain.root")];
  }
  if (presentation === "wizard") {
    if (options?.allowCreative) {
      return [
        createGenerateBlueprintStep(),
        createLayoutSkeletonStep("wizard.shell"),
      ];
    }
    return [createLayoutSkeletonStep("wizard.shell")];
  }
  return [];
}

export function expandStepsAfterWizardStepsDefined(): UiBuilderStep[] {
  return [createAllocateFieldsToStepsStep()];
}

export function expandStepsAfterFieldAllocation(): UiBuilderStep[] {
  return [createLayoutSkeletonStep("wizard.steps[0]")];
}

function wizardStepPathKey(index: number): string {
  return `wizard.steps[${index}]`;
}

function pendingConfigureStepsForTarget(
  draft: FormsUiBuilderDraft,
  pathKey: string,
): UiBuilderStep[] {
  const target = draft.layoutTargets[pathKey];
  if (!target?.skeleton) {
    return [];
  }
  return expandStepsAfterLayoutSkeleton(pathKey, target.skeleton).filter(
    (step) => !draft.completedStepIds.includes(step.id),
  );
}

function targetConfigureComplete(
  draft: FormsUiBuilderDraft,
  pathKey: string,
): boolean {
  const target = draft.layoutTargets[pathKey];
  if (!target?.skeleton) {
    return false;
  }
  return pendingConfigureStepsForTarget(draft, pathKey).length === 0;
}

export function appendNextFormsLayoutTargetIfReady(
  draft: FormsUiBuilderDraft,
): UiBuilderStep[] {
  if (draft.presentation === "plain") {
    return [];
  }

  if (draft.presentation !== "wizard") {
    return [];
  }

  const shellPath = "wizard.shell";
  if (!draft.layoutTargets[shellPath]?.skeleton) {
    return [];
  }

  if (!targetConfigureComplete(draft, shellPath)) {
    return [];
  }

  if (!draft.wizardSteps || draft.wizardSteps.length === 0) {
    if (draft.creativeMode && draft.formBlueprint) {
      return [];
    }
    if (
      !draft.completedStepIds.includes(FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS)
    ) {
      return [createDefineWizardStepsStep()];
    }
    if (
      !draft.completedStepIds.includes(
        FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
      )
    ) {
      return [createAllocateFieldsToStepsStep()];
    }
    return [];
  }

  if (draft.creativeMode && draft.formBlueprint) {
    const steps = draft.wizardSteps;
    for (let index = 0; index < steps.length; index++) {
      const pathKey = wizardStepPathKey(index);
      if (!draft.layoutTargets[pathKey]?.skeleton) {
        return [createLayoutSkeletonStep(pathKey)];
      }
      if (!targetConfigureComplete(draft, pathKey)) {
        return [];
      }
    }

    const footerPath = "wizard.modalFooter";
    if (!draft.layoutTargets[footerPath]?.skeleton) {
      return [createLayoutSkeletonStep(footerPath)];
    }

    return [];
  }

  const firstStepHasFields = draft.wizardSteps.some(
    (step) => (step.fieldPaths?.length ?? 0) > 0,
  );
  if (
    !firstStepHasFields &&
    !draft.completedStepIds.includes(FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS)
  ) {
    return [createAllocateFieldsToStepsStep()];
  }

  const steps = draft.wizardSteps;
  for (let index = 0; index < steps.length; index++) {
    const pathKey = wizardStepPathKey(index);
    if (!draft.layoutTargets[pathKey]?.skeleton) {
      return [createLayoutSkeletonStep(pathKey)];
    }
    if (!targetConfigureComplete(draft, pathKey)) {
      return [];
    }
  }

  const footerPath = "wizard.modalFooter";
  if (!draft.layoutTargets[footerPath]?.skeleton) {
    return [createLayoutSkeletonStep(footerPath)];
  }

  return [];
}

interface WalkContext {
  readonly pathKey: string;
  readonly prefix: string;
  readonly depth: number;
}

function walkSkeletonComponents(
  components: readonly SkeletonComponentSpec[],
  context: WalkContext,
  steps: UiBuilderStep[],
): void {
  for (let index = 0; index < components.length; index++) {
    const component = components[index]!;
    const componentPath = `${context.prefix}/${index}`;

    if (component.kind === "nested-layout") {
      const columns = component.columns ?? [];
      if (context.depth >= MAX_NESTED_DEPTH) {
        continue;
      }
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        walkSkeletonComponents(
          columns[colIndex]!.components,
          {
            pathKey: context.pathKey,
            prefix: `${componentPath}/col${colIndex}`,
            depth: context.depth + 1,
          },
          steps,
        );
      }
      continue;
    }

    steps.push(
      createConfigureComponentStep(
        context.pathKey,
        componentPath,
        component.kind,
        component.fieldPath,
      ),
    );
  }
}

export function expandStepsAfterLayoutSkeleton(
  pathKey: string,
  skeleton: readonly SkeletonComponentSpec[],
): UiBuilderStep[] {
  const steps: UiBuilderStep[] = [];
  walkSkeletonComponents(
    skeleton,
    {
      pathKey,
      prefix: "root",
      depth: 0,
    },
    steps,
  );
  return steps;
}

export { componentConfigKey, wizardStepPathKey };
