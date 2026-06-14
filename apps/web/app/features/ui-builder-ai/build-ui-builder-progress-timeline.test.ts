import { describe, expect, it } from "vitest";

import { buildUiBuilderProgressTimeline } from "./build-ui-builder-progress-timeline";

const t = (key: string, params?: Record<string, string | number>): string => {
  if (params) {
    return `${key}:${JSON.stringify(params)}`;
  }
  return key;
};

describe("buildUiBuilderProgressTimeline", () => {
  it("builds list card mid-run timeline with done and running rows", () => {
    const items = buildUiBuilderProgressTimeline({
      surface: "list",
      status: "running",
      progress: {
        stepIndex: 2,
        totalSteps: 4,
        stepId: "list.layoutSkeleton:listItem",
        stepLabel: "Designing layout skeleton (listItem)",
        phase: "layout",
      },
      draft: {
        surface: "list",
        listViewType: "card",
        completedStepIds: ["list.selectViewType"],
        layoutTargets: {},
      },
      t,
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "list.selectViewType",
      status: "done",
    });
    expect(items[0]?.title).toContain("listViewTypeSelected");
    expect(items[1]).toMatchObject({
      id: "running:list.layoutSkeleton:listItem",
      status: "running",
      title: "Designing layout skeleton (listItem)",
    });
  });

  it("builds forms wizard timeline with pending step rows while configuring step 1", () => {
    const items = buildUiBuilderProgressTimeline({
      surface: "forms",
      status: "running",
      progress: {
        stepIndex: 5,
        totalSteps: 12,
        stepId: "forms.configureComponent:wizard.steps[0]:root/0",
        stepLabel: "Configuring form-field component",
        phase: "component",
      },
      draft: {
        surface: "forms",
        presentation: "wizard",
        wizardSteps: [
          { id: "contact", label: "Contact" },
          { id: "details", label: "Details" },
          { id: "review", label: "Review" },
        ],
        completedStepIds: [
          "forms.selectPresentation",
          "forms.defineWizardSteps",
          "forms.layoutSkeleton:wizard.shell",
          "forms.layoutSkeleton:wizard.steps[0]",
        ],
        layoutTargets: {
          "wizard.shell": {
            skeleton: [{ kind: "wizard-progress" }],
            componentConfigs: {},
          },
          "wizard.steps[0]": {
            skeleton: [{ kind: "form-field", fieldPath: "email" }],
            componentConfigs: {},
          },
        },
      },
      t,
    });

    expect(items.some((item) => item.id === "forms.selectPresentation")).toBe(
      true,
    );
    expect(items.some((item) => item.id === "forms.defineWizardSteps")).toBe(
      true,
    );
    expect(
      items.some(
        (item) =>
          item.id === "running:forms.configureComponent:wizard.steps[0]:root/0",
      ),
    ).toBe(true);

    const pendingStepLayouts = items.filter(
      (item) =>
        item.status === "pending" &&
        item.id.startsWith("pending:forms.layoutSkeleton:wizard.steps"),
    );
    expect(pendingStepLayouts).toHaveLength(1);
    expect(pendingStepLayouts[0]?.title).toContain("pendingWizardStepLayout");
  });

  it("marks running step as failed when job status is failed", () => {
    const items = buildUiBuilderProgressTimeline({
      surface: "list",
      status: "failed",
      progress: {
        stepIndex: 2,
        totalSteps: 4,
        stepId: "list.layoutSkeleton:listItem",
        stepLabel: "Designing layout skeleton (listItem)",
        phase: "layout",
      },
      draft: {
        surface: "list",
        listViewType: "card",
        completedStepIds: ["list.selectViewType"],
        layoutTargets: {},
      },
      t,
    });

    const failedItem = items.find((item) => item.status === "failed");
    expect(failedItem?.title).toBe("Designing layout skeleton (listItem)");
  });

  it("builds render HTML timeline for formsRender steps", () => {
    const items = buildUiBuilderProgressTimeline({
      surface: "forms",
      status: "running",
      progress: {
        stepIndex: 1,
        totalSteps: 1,
        stepId: "formsRender.composeHtml",
        stepLabel: "Generating HTML form",
        phase: "render",
      },
      draft: {
        surface: "forms",
        outputMode: "render",
        completedStepIds: [],
      },
      t,
    });

    expect(items[0]).toMatchObject({
      id: "running:formsRender.composeHtml",
      status: "running",
      title: "Generating HTML form",
    });
  });
});
