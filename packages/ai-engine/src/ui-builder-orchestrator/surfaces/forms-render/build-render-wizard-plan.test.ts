import { describe, expect, it } from "vitest";

import {
  buildRenderWizardPlan,
  shouldUseRenderWizardMode,
} from "./build-render-wizard-plan.js";

describe("buildRenderWizardPlan", () => {
  it("allocates fields into editable steps and adds a review step", () => {
    const plan = buildRenderWizardPlan([
      "name",
      "type",
      "category",
      "provider",
      "amount",
      "startDate",
    ]);

    expect(plan.presentation).toBe("wizard");
    expect(plan.steps.at(-1)).toMatchObject({
      id: "step-review",
      label: "Review & Confirm",
      readOnly: true,
      fieldPaths: [],
    });

    const editablePaths = plan.steps
      .filter((step) => !step.readOnly)
      .flatMap((step) => step.fieldPaths);
    expect(editablePaths).toEqual([
      "name",
      "type",
      "category",
      "provider",
      "amount",
      "startDate",
    ]);
  });

  it("derives labels from shared field path prefixes", () => {
    const plan = buildRenderWizardPlan([
      "provider.name",
      "provider.logo",
      "financial.amount",
      "financial.currency",
    ]);

    const editable = plan.steps.filter((step) => !step.readOnly);
    expect(editable[0]?.label).toBe("Provider");
    expect(editable[1]?.label).toBe("Financial");
  });

  it("labels the first step Basic Information for flat field paths", () => {
    const plan = buildRenderWizardPlan(["name", "type"]);
    expect(plan.steps[0]?.label).toBe("Basic Information");
  });
});

describe("shouldUseRenderWizardMode", () => {
  it("forces wizard when presentation hint is wizard", () => {
    expect(shouldUseRenderWizardMode(["name"], "wizard")).toBe(true);
  });

  it("forces plain when presentation hint is plain", () => {
    expect(
      shouldUseRenderWizardMode(["a", "b", "c", "d", "e", "f", "g"], "plain"),
    ).toBe(false);
  });

  it("auto-selects wizard when field count meets threshold", () => {
    expect(shouldUseRenderWizardMode(["a", "b", "c", "d", "e", "f"])).toBe(
      true,
    );
    expect(shouldUseRenderWizardMode(["a", "b", "c"])).toBe(false);
  });
});
