import { MAX_NESTED_DEPTH } from "../../limits.js";
import { componentConfigKey } from "../../layout-path.js";
import type {
  ListUiBuilderDraft,
  SkeletonComponentSpec,
  UiBuilderStep,
} from "../../types.js";
import { LIST_STEP_TYPES } from "./list-steps.js";

export function createSelectViewTypeStep(): UiBuilderStep {
  return {
    id: LIST_STEP_TYPES.SELECT_VIEW_TYPE,
    type: LIST_STEP_TYPES.SELECT_VIEW_TYPE,
    label: "Selecting list presentation",
    phase: "selection",
  };
}

export function createTableSelectFieldsStep(): UiBuilderStep {
  return {
    id: LIST_STEP_TYPES.TABLE_SELECT_FIELDS,
    type: LIST_STEP_TYPES.TABLE_SELECT_FIELDS,
    label: "Choosing table columns",
    phase: "table",
  };
}

export function createExpandableDefineColumnsStep(): UiBuilderStep {
  return {
    id: LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS,
    type: LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS,
    label: "Defining grouped columns",
    phase: "expandableTable",
  };
}

export function createLayoutSkeletonStep(pathKey: string): UiBuilderStep {
  return {
    id: `${LIST_STEP_TYPES.LAYOUT_SKELETON}:${pathKey}`,
    type: LIST_STEP_TYPES.LAYOUT_SKELETON,
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
    id: `${LIST_STEP_TYPES.CONFIGURE_COMPONENT}:${pathKey}:${componentPath}`,
    type: LIST_STEP_TYPES.CONFIGURE_COMPONENT,
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

export function expandStepsAfterViewType(
  listViewType: ListUiBuilderDraft["listViewType"],
): UiBuilderStep[] {
  if (listViewType === "card") {
    return [createLayoutSkeletonStep("listItem")];
  }
  if (listViewType === "expandableTable") {
    return [createExpandableDefineColumnsStep()];
  }
  return [];
}

export function expandStepsAfterExpandableColumns(
  columnCount: number,
): UiBuilderStep[] {
  if (columnCount <= 0) {
    return [];
  }
  return [createLayoutSkeletonStep("expandableTable.columns[0].cellLayout")];
}

export function appendNextExpandableSkeletonIfReady(
  draft: ListUiBuilderDraft,
): UiBuilderStep[] {
  if (draft.listViewType !== "expandableTable") {
    return [];
  }

  const columns = draft.expandableColumns ?? [];
  for (let index = 0; index < columns.length; index++) {
    const pathKey = `expandableTable.columns[${index}].cellLayout`;
    const target = draft.layoutTargets[pathKey];
    if (!target?.skeleton) {
      return [createLayoutSkeletonStep(pathKey)];
    }

    const pendingConfigure = expandStepsAfterLayoutSkeleton(
      pathKey,
      target.skeleton,
    ).filter((step) => !draft.completedStepIds.includes(step.id));
    if (pendingConfigure.length > 0) {
      return [];
    }
  }

  const rowPath = "expandableTable.rowExpandLayout";
  if (!draft.layoutTargets[rowPath]?.skeleton) {
    return [createLayoutSkeletonStep(rowPath)];
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

    if (component.kind === "grid" || component.kind === "nested-layout") {
      const tracks = component.tracks ?? component.columns ?? [];
      if (context.depth >= MAX_NESTED_DEPTH) {
        continue;
      }
      for (let colIndex = 0; colIndex < tracks.length; colIndex++) {
        walkSkeletonComponents(
          tracks[colIndex]!.components,
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

export { componentConfigKey };
