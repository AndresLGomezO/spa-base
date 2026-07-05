import type {
  DefinedEntity,
  FieldDefinitions,
  FormsSliceData,
} from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
  createDefaultFormLayout,
  createDefaultWizardFormConfig,
  createLayoutId,
  ensureContainerRoot,
  normalizeLayout,
  resolveRootContainerLocator,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import { componentConfigKey } from "../../layout-path.js";
import type {
  FormsUiBuilderDraft,
  SkeletonComponentSpec,
} from "../../types.js";
import { sanitizeFormComponentConfig } from "./sanitize-form-component-config.js";
import { wizardStepPathKey } from "./forms-plan.js";
import {
  buildGridRowFromSkeleton,
  isGridSkeletonSpec,
} from "../skeleton-grid-assembler.js";

function buildRowsFromSkeleton(
  skeleton: readonly SkeletonComponentSpec[],
  configs: Readonly<
    Record<string, import("@repo/ui-builder-core").UiComponentConfig>
  >,
  prefix: string,
): RowNode[] {
  const rows: RowNode[] = [];

  for (let index = 0; index < skeleton.length; index++) {
    const spec = skeleton[index]!;
    const path = `${prefix}/${index}`;

    if (isGridSkeletonSpec(spec)) {
      rows.push(
        buildGridRowFromSkeleton(
          spec,
          (components, childPath) =>
            buildRowsFromSkeleton(components, configs, childPath),
          path,
        ),
      );
      continue;
    }

    const config = sanitizeFormComponentConfig(
      spec.kind,
      spec.fieldPath ?? "name",
      configs[componentConfigKey(path)],
    );

    rows.push({
      type: "component",
      id: createLayoutId("row"),
      component: config,
      ...(spec.displayFrom ? { displayFrom: spec.displayFrom } : {}),
      ...(spec.displayTo ? { displayTo: spec.displayTo } : {}),
    });
  }

  return rows;
}

function buildLayoutFromTarget(
  target: FormsUiBuilderDraft["layoutTargets"][string] | undefined,
  fallback: UiLayoutDocument,
): UiLayoutDocument {
  if (!target?.skeleton || target.skeleton.length === 0) {
    return fallback;
  }

  const rows = buildRowsFromSkeleton(
    target.skeleton,
    target.componentConfigs,
    "root",
  );

  return ensureContainerRoot(
    normalizeLayout({
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [
          {
            id: createLayoutId("col"),
            rows,
          },
        ],
      },
      showActions: true,
      cardsPerRow: 1,
    }),
  );
}

function hasFormActions(rows: readonly SkeletonComponentSpec[]): boolean {
  for (const spec of rows) {
    if (spec.kind === "form-actions" || spec.kind === "wizard-actions") {
      return true;
    }
    if (isGridSkeletonSpec(spec)) {
      for (const track of spec.tracks ?? spec.columns ?? []) {
        if (hasFormActions(track.components)) {
          return true;
        }
      }
    }
  }
  return false;
}

function ensurePlainFormActions(
  layout: UiLayoutDocument,
  skeleton: readonly SkeletonComponentSpec[],
): UiLayoutDocument {
  if (hasFormActions(skeleton)) {
    return layout;
  }
  const locator =
    resolveRootContainerLocator(layout) ??
    ({ scope: "root", columnIndex: 0 } as const);
  return addComponentRowAt(
    layout,
    locator,
    createDefaultComponent("form-actions"),
  );
}

export function assembleFormsSliceData(
  entity: DefinedEntity<string, FieldDefinitions>,
  draft: FormsUiBuilderDraft,
): FormsSliceData {
  if (!draft.presentation) {
    throw new Error("Form presentation is required to assemble output.");
  }

  const fieldPaths = Object.keys(entity.metadata.fields);
  const defaultPlainLayout = createDefaultFormLayout(fieldPaths);
  const defaultWizard = createDefaultWizardFormConfig(fieldPaths);

  if (draft.presentation === "plain") {
    const plainTarget = draft.layoutTargets["plain.root"];
    let layout = buildLayoutFromTarget(plainTarget, defaultPlainLayout);
    if (plainTarget?.skeleton) {
      layout = ensurePlainFormActions(layout, plainTarget.skeleton);
    }
    return {
      presentation: "plain",
      layout,
    };
  }

  const shellTarget = draft.layoutTargets["wizard.shell"];
  const shellLayout = buildLayoutFromTarget(
    shellTarget,
    defaultWizard.shellLayout,
  );

  const wizardSteps = draft.wizardSteps ?? [{ id: "step-1", label: "Step 1" }];
  const steps = wizardSteps.map((stepMeta, index) => {
    const pathKey = wizardStepPathKey(index);
    const stepTarget = draft.layoutTargets[pathKey];
    return {
      id: stepMeta.id,
      label: stepMeta.label,
      layout: buildLayoutFromTarget(stepTarget, defaultWizard.steps[0]!.layout),
    };
  });

  const footerTarget = draft.layoutTargets["wizard.modalFooter"];
  const modalFooterLayout = footerTarget
    ? buildLayoutFromTarget(footerTarget, defaultPlainLayout)
    : undefined;

  return {
    presentation: "wizard",
    wizard: {
      shellLayout,
      steps,
    },
    ...(modalFooterLayout ? { modalFooterLayout } : {}),
  };
}
