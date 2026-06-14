import { describe, expect, it } from "vitest";

import {
  assembleFormsRenderWizardHtml,
  validateWizardFieldCoverage,
} from "./assemble-forms-render-wizard-html.js";

describe("assembleFormsRenderWizardHtml", () => {
  it("assembles shell, sidebar, and step panels with target navigation CSS", () => {
    const html = assembleFormsRenderWizardHtml({
      wizardTitle: "New Contract",
      wizardSubtitle: "Create a contract",
      sharedStyles: ".wizard-shell{display:flex}",
      sidebarHtml:
        '<nav><a href="#step-1">Basic</a><a href="#step-review">Review</a></nav>',
      steps: [
        {
          id: "step-1",
          title: "Basic Information",
          panelHtml: '<label>Name<input name="name" type="text"></label>',
        },
        {
          id: "step-review",
          title: "Review & Confirm",
          panelHtml: "<p>Summary</p>",
        },
      ],
      layoutSummary: "Two-step wizard with sidebar navigation",
    });

    expect(html).toContain('id="step-1"');
    expect(html).toContain('id="step-review"');
    expect(html).toContain('class="step-panel"');
    expect(html).toContain(".step-panel:target");
    expect(html).toContain('name="name"');
    expect(html).not.toContain("<script");
  });

  it("validates field coverage across assembled HTML", () => {
    const html = assembleFormsRenderWizardHtml({
      wizardTitle: "Form",
      wizardSubtitle: "Subtitle",
      sharedStyles: "",
      sidebarHtml: "<nav></nav>",
      steps: [
        {
          id: "step-1",
          title: "Details",
          panelHtml: '<input name="name"><input name="type">',
        },
      ],
      layoutSummary: "Single step",
    });

    expect(validateWizardFieldCoverage(html, ["name", "type"])).toEqual([]);
    expect(validateWizardFieldCoverage(html, ["missing"])).toEqual([
      "Missing field: missing",
    ]);
  });
});
