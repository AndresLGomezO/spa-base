import type {
  AiJobProgress,
  AiJobStatus,
  UiBuilderJobDraft,
} from "../../lib/api-client";

export type ProgressTimelineItemStatus =
  | "done"
  | "running"
  | "pending"
  | "failed";

export interface ProgressTimelineItem {
  readonly id: string;
  readonly status: ProgressTimelineItemStatus;
  readonly title: string;
  readonly detail?: string;
}

type UiBuilderProgressTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

interface SkeletonComponentSpec {
  readonly kind: string;
  readonly fieldPath?: string;
  readonly columns?: readonly {
    readonly components: readonly SkeletonComponentSpec[];
  }[];
}

interface BuildUiBuilderProgressTimelineInput {
  readonly surface: "list" | "forms";
  readonly status: AiJobStatus;
  readonly progress?: AiJobProgress | null;
  readonly draft?: UiBuilderJobDraft | null;
  readonly t: UiBuilderProgressTranslate;
}

function isRenderProgressStep(stepId: string | undefined): boolean {
  return stepId?.startsWith("formsRender.") ?? false;
}

function summarizeRenderCompletedStep(
  stepId: string,
  t: UiBuilderProgressTranslate,
): ProgressTimelineItem {
  if (stepId === "formsRender.composeHtml") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.renderComposeHtml"),
    };
  }
  if (stepId === "formsRender.composeBrief") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.renderComposeBrief"),
    };
  }
  if (stepId === "formsRender.refineHtml") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.renderRefineHtml"),
    };
  }
  if (stepId === "formsRender.refineBrief") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.renderRefineBrief"),
    };
  }
  if (stepId === "formsRender.generateImage") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.renderGenerateImage"),
    };
  }
  return { id: stepId, status: "done", title: stepId };
}

function appendRenderPendingItems(
  completedStepIds: readonly string[],
  items: ProgressTimelineItem[],
  t: UiBuilderProgressTranslate,
): void {
  const htmlStepDone =
    completedStepIds.includes("formsRender.composeHtml") ||
    completedStepIds.includes("formsRender.composeBrief") ||
    completedStepIds.includes("formsRender.refineHtml") ||
    completedStepIds.includes("formsRender.refineBrief");

  if (!htmlStepDone) {
    items.push({
      id: "pending:formsRender.composeHtml",
      status: "pending",
      title: t("uiBuilderAi.progress.renderComposeHtml"),
    });
  }
}

function layoutTargetSkeleton(
  draft: UiBuilderJobDraft,
  pathKey: string,
): readonly SkeletonComponentSpec[] | undefined {
  const target = draft.layoutTargets?.[pathKey];
  return target?.skeleton as readonly SkeletonComponentSpec[] | undefined;
}

function resolveComponentAtPath(
  skeleton: readonly SkeletonComponentSpec[],
  componentPath: string,
): SkeletonComponentSpec | undefined {
  const segments = componentPath.split("/").filter(Boolean);
  if (segments[0] !== "root") {
    return undefined;
  }

  let components: readonly SkeletonComponentSpec[] = skeleton;
  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index]!;
    if (segment.startsWith("col")) {
      const parentIndex = Number.parseInt(segments[index - 1] ?? "", 10);
      const colIndex = Number.parseInt(segment.slice(3), 10);
      const parent = components[parentIndex];
      if (!parent?.columns?.[colIndex]) {
        return undefined;
      }
      components = parent.columns[colIndex]!.components;
      continue;
    }

    const componentIndex = Number.parseInt(segment, 10);
    if (Number.isNaN(componentIndex)) {
      return undefined;
    }
    if (index === segments.length - 1) {
      return components[componentIndex];
    }
    const next = segments[index + 1];
    const current = components[componentIndex];
    if (next?.startsWith("col") && current?.columns) {
      continue;
    }
    return undefined;
  }

  return undefined;
}

function summarizeConfigureStep(
  stepId: string,
  draft: UiBuilderJobDraft,
  t: UiBuilderProgressTranslate,
): ProgressTimelineItem {
  const prefix = stepId.includes("forms.configureComponent")
    ? "forms.configureComponent:"
    : "list.configureComponent:";
  const remainder = stepId.slice(prefix.length);
  const separatorIndex = remainder.indexOf(":");
  const pathKey =
    separatorIndex >= 0 ? remainder.slice(0, separatorIndex) : remainder;
  const componentPath =
    separatorIndex >= 0 ? remainder.slice(separatorIndex + 1) : "";

  const skeleton = layoutTargetSkeleton(draft, pathKey);
  const component =
    skeleton && componentPath
      ? resolveComponentAtPath(skeleton, componentPath)
      : undefined;

  if (component) {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.configuredComponent", {
        kind: component.kind,
        field: component.fieldPath ?? pathKey,
      }),
    };
  }

  return {
    id: stepId,
    status: "done",
    title: t("uiBuilderAi.progress.configuredComponentFallback"),
    detail: pathKey,
  };
}

function summarizeListCompletedStep(
  stepId: string,
  draft: UiBuilderJobDraft,
  t: UiBuilderProgressTranslate,
): ProgressTimelineItem {
  if (stepId === "list.selectViewType") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.listViewTypeSelected", {
        viewType: draft.listViewType ?? "expandableTable",
      }),
    };
  }

  if (stepId === "list.tableSelectFields") {
    const count = draft.table?.fields?.length ?? 0;
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.tableColumnsChosen", { count }),
    };
  }

  if (stepId === "list.expandableDefineColumns") {
    const count = draft.expandableColumns?.length ?? 0;
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.groupedColumnsDefined", { count }),
    };
  }

  if (stepId.startsWith("list.layoutSkeleton:")) {
    const pathKey = stepId.slice("list.layoutSkeleton:".length);
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.layoutSkeletonDesigned", {
        target: pathKey,
      }),
    };
  }

  if (stepId.startsWith("list.configureComponent:")) {
    return summarizeConfigureStep(stepId, draft, t);
  }

  return {
    id: stepId,
    status: "done",
    title: stepId,
  };
}

function summarizeFormsCompletedStep(
  stepId: string,
  draft: UiBuilderJobDraft,
  t: UiBuilderProgressTranslate,
): ProgressTimelineItem {
  if (stepId === "forms.selectPresentation") {
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.presentationSelected", {
        presentation: draft.presentation ?? "plain",
      }),
    };
  }

  if (stepId === "forms.defineWizardSteps") {
    const steps = draft.wizardSteps ?? [];
    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.wizardStepsDefined", {
        count: steps.length,
      }),
      detail:
        steps.length > 0
          ? steps.map((step) => step.label).join(", ")
          : undefined,
    };
  }

  if (stepId.startsWith("forms.layoutSkeleton:")) {
    const pathKey = stepId.slice("forms.layoutSkeleton:".length);
    const wizardStepMatch = /^wizard\.steps\[(\d+)\]$/.exec(pathKey);
    if (wizardStepMatch) {
      const index = Number.parseInt(wizardStepMatch[1] ?? "0", 10);
      const label = draft.wizardSteps?.[index]?.label ?? `Step ${index + 1}`;
      return {
        id: stepId,
        status: "done",
        title: t("uiBuilderAi.progress.wizardStepLayoutDesigned", {
          step: index + 1,
          label,
        }),
      };
    }

    if (pathKey === "wizard.shell") {
      return {
        id: stepId,
        status: "done",
        title: t("uiBuilderAi.progress.wizardShellLayoutDesigned"),
      };
    }

    if (pathKey === "wizard.modalFooter") {
      return {
        id: stepId,
        status: "done",
        title: t("uiBuilderAi.progress.modalFooterLayoutDesigned"),
      };
    }

    if (pathKey === "plain.root") {
      return {
        id: stepId,
        status: "done",
        title: t("uiBuilderAi.progress.formLayoutDesigned"),
      };
    }

    return {
      id: stepId,
      status: "done",
      title: t("uiBuilderAi.progress.layoutSkeletonDesigned", {
        target: pathKey,
      }),
    };
  }

  if (stepId.startsWith("forms.configureComponent:")) {
    return summarizeConfigureStep(stepId, draft, t);
  }

  return {
    id: stepId,
    status: "done",
    title: stepId,
  };
}

function summarizeCompletedStep(
  stepId: string,
  surface: "list" | "forms",
  draft: UiBuilderJobDraft,
  t: UiBuilderProgressTranslate,
): ProgressTimelineItem {
  if (surface === "forms") {
    return summarizeFormsCompletedStep(stepId, draft, t);
  }
  return summarizeListCompletedStep(stepId, draft, t);
}

function hasCompletedStep(
  completedStepIds: readonly string[],
  stepId: string,
): boolean {
  return completedStepIds.includes(stepId);
}

function appendListPendingItems(
  draft: UiBuilderJobDraft,
  completedStepIds: readonly string[],
  items: ProgressTimelineItem[],
  t: UiBuilderProgressTranslate,
): void {
  const listViewType = draft.listViewType;
  if (!listViewType) {
    return;
  }

  if (listViewType === "card") {
    if (!layoutTargetSkeleton(draft, "listItem")) {
      items.push({
        id: "pending:list.layoutSkeleton:listItem",
        status: "pending",
        title: t("uiBuilderAi.progress.pendingListItemLayout"),
      });
    } else if (
      !hasCompletedStep(completedStepIds, "list.layoutSkeleton:listItem")
    ) {
      items.push({
        id: "pending:list.configure:listItem",
        status: "pending",
        title: t("uiBuilderAi.progress.pendingConfigureComponents", {
          target: "listItem",
        }),
      });
    }
    return;
  }

  if (listViewType === "expandableTable") {
    const columns = draft.expandableColumns ?? [];
    if (!hasCompletedStep(completedStepIds, "list.expandableDefineColumns")) {
      items.push({
        id: "pending:list.expandableDefineColumns",
        status: "pending",
        title: t("uiBuilderAi.progress.pendingGroupedColumns"),
      });
      return;
    }

    for (let index = 0; index < columns.length; index++) {
      const pathKey = `expandableTable.columns[${index}].cellLayout`;
      if (!layoutTargetSkeleton(draft, pathKey)) {
        items.push({
          id: `pending:list.layoutSkeleton:${pathKey}`,
          status: "pending",
          title: t("uiBuilderAi.progress.pendingColumnLayout", {
            index: index + 1,
          }),
        });
        return;
      }
    }

    if (!layoutTargetSkeleton(draft, "expandableTable.rowExpandLayout")) {
      items.push({
        id: "pending:list.layoutSkeleton:expandableTable.rowExpandLayout",
        status: "pending",
        title: t("uiBuilderAi.progress.pendingExpandedRowLayout"),
      });
    }
  }
}

function appendFormsPendingItems(
  draft: UiBuilderJobDraft,
  completedStepIds: readonly string[],
  items: ProgressTimelineItem[],
  t: UiBuilderProgressTranslate,
): void {
  const presentation = draft.presentation;
  if (!presentation) {
    return;
  }

  if (presentation === "plain") {
    if (!layoutTargetSkeleton(draft, "plain.root")) {
      items.push({
        id: "pending:forms.layoutSkeleton:plain.root",
        status: "pending",
        title: t("uiBuilderAi.progress.pendingFormLayout"),
      });
    } else if (
      !hasCompletedStep(completedStepIds, "forms.layoutSkeleton:plain.root")
    ) {
      items.push({
        id: "pending:forms.configure:plain.root",
        status: "pending",
        title: t("uiBuilderAi.progress.pendingConfigureComponents", {
          target: "form",
        }),
      });
    }
    return;
  }

  if (!layoutTargetSkeleton(draft, "wizard.shell")) {
    items.push({
      id: "pending:forms.layoutSkeleton:wizard.shell",
      status: "pending",
      title: t("uiBuilderAi.progress.pendingWizardShellLayout"),
    });
    return;
  }

  const wizardSteps = draft.wizardSteps ?? [];
  if (
    wizardSteps.length === 0 &&
    !hasCompletedStep(completedStepIds, "forms.defineWizardSteps")
  ) {
    items.push({
      id: "pending:forms.defineWizardSteps",
      status: "pending",
      title: t("uiBuilderAi.progress.pendingWizardSteps"),
    });
    return;
  }

  for (let index = 0; index < wizardSteps.length; index++) {
    const pathKey = `wizard.steps[${index}]`;
    const stepLabel = wizardSteps[index]?.label ?? `Step ${index + 1}`;
    if (!layoutTargetSkeleton(draft, pathKey)) {
      items.push({
        id: `pending:forms.layoutSkeleton:${pathKey}`,
        status: "pending",
        title: t("uiBuilderAi.progress.pendingWizardStepLayout", {
          step: index + 1,
          label: stepLabel,
        }),
      });
      return;
    }
  }

  if (!layoutTargetSkeleton(draft, "wizard.modalFooter")) {
    items.push({
      id: "pending:forms.layoutSkeleton:wizard.modalFooter",
      status: "pending",
      title: t("uiBuilderAi.progress.pendingModalFooterLayout"),
    });
  }
}

export function buildUiBuilderProgressTimeline({
  surface,
  status,
  progress,
  draft,
  t,
}: BuildUiBuilderProgressTimelineInput): ProgressTimelineItem[] {
  const items: ProgressTimelineItem[] = [];
  const completedStepIds = draft?.completedStepIds ?? [];
  const draftState = draft ?? {};
  const renderJob =
    isRenderProgressStep(progress?.stepId) ||
    completedStepIds.some((stepId) => stepId.startsWith("formsRender."));

  if (renderJob) {
    for (const stepId of completedStepIds) {
      if (stepId.startsWith("formsRender.")) {
        items.push(summarizeRenderCompletedStep(stepId, t));
      }
    }

    const runningStepId = progress?.stepId;
    const runningAlreadyCompleted =
      runningStepId != null && completedStepIds.includes(runningStepId);
    const showActiveStep =
      runningStepId != null &&
      !runningAlreadyCompleted &&
      (status === "running" || status === "failed");

    if (showActiveStep) {
      items.push({
        id: `running:${runningStepId}`,
        status: status === "failed" ? "failed" : "running",
        title: progress!.stepLabel,
      });
    }

    if (status === "running") {
      appendRenderPendingItems(completedStepIds, items, t);
    }

    return items;
  }

  for (const stepId of completedStepIds) {
    items.push(summarizeCompletedStep(stepId, surface, draftState, t));
  }

  const runningStepId = progress?.stepId;
  const runningAlreadyCompleted =
    runningStepId != null && completedStepIds.includes(runningStepId);
  const showActiveStep =
    runningStepId != null &&
    !runningAlreadyCompleted &&
    (status === "running" || status === "failed");

  if (showActiveStep) {
    items.push({
      id: `running:${runningStepId}`,
      status: status === "failed" ? "failed" : "running",
      title: progress!.stepLabel,
    });
  }

  if (status === "running") {
    const pendingItems: ProgressTimelineItem[] = [];
    if (surface === "list") {
      appendListPendingItems(draftState, completedStepIds, pendingItems, t);
    } else {
      appendFormsPendingItems(draftState, completedStepIds, pendingItems, t);
    }

    for (const pending of pendingItems) {
      if (runningStepId && pending.id.includes(runningStepId)) {
        continue;
      }
      items.push(pending);
    }
  }

  return items;
}
