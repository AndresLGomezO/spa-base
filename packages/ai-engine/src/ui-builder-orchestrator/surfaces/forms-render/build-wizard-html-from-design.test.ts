import { describe, expect, it } from "vitest";

import { buildRenderWizardPlan } from "./build-render-wizard-plan.js";
import {
  buildWizardHtmlFromDesign,
  normalizeWizardDesignSteps,
} from "./build-wizard-html-from-design.js";

describe("buildWizardHtmlFromDesign", () => {
  it("assembles navigable wizard HTML from lightweight design JSON", () => {
    const plan = buildRenderWizardPlan([
      "name",
      "type",
      "provider.name",
      "amount",
    ]);
    const design = normalizeWizardDesignSteps(plan, {
      wizardTitle: "New Contract",
      wizardSubtitle: "Create a new contract in a few easy steps",
      steps: [
        { id: "step-1", title: "Basics", subtitle: "Core details" },
        { id: "step-2", title: "Provider", subtitle: "Pick a vendor" },
        { id: "step-review", title: "Review", subtitle: "Confirm" },
      ],
      layoutSummary: "Premium contract wizard",
    });

    const html = buildWizardHtmlFromDesign(plan, design);

    expect(html).toContain('id="step-1"');
    expect(html).toContain('id="step-review"');
    expect(html).toContain('name="name"');
    expect(html).toContain('name="provider.name"');
    expect(html).toContain(".step-panel:target");
    expect(html).not.toContain("<script");
  });
});

describe("formsRenderWizardDesignOutputSchema size", () => {
  it("mock design JSON stays compact without embedded HTML", () => {
    const plan = buildRenderWizardPlan(["a", "b", "c", "d", "e", "f", "g"]);
    const design = {
      wizardTitle: "Test",
      wizardSubtitle: "Subtitle",
      steps: plan.steps.map((step) => ({
        id: step.id,
        title: step.label,
      })),
      layoutSummary: "Summary",
    };
    const json = JSON.stringify(design);
    expect(json.length).toBeLessThan(2_000);
    expect(json).not.toContain("<div");
  });
});
