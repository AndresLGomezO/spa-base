import { describe, expect, it } from "vitest";

import type { FormBlueprint } from "./forms-blueprint.schema.js";
import {
  blueprintPrefersStepperProgress,
  parseBlueprintHelper,
  resolveWizardProgressVariantFromTheme,
  translateBlueprintToWizardSteps,
} from "./translate-form-blueprint.js";

const formFields = [
  "name",
  "contractType",
  "providerId",
  "categoryId",
  "currency",
  "status",
  "notes",
] as const;

describe("parseBlueprintHelper", () => {
  it("parses info-box helpers", () => {
    expect(parseBlueprintHelper("info-box -> 'Keep names consistent'")).toEqual(
      {
        helperKind: "info-box",
        helperText: "Keep names consistent",
      },
    );
  });

  it("parses callout-warning helpers", () => {
    expect(
      parseBlueprintHelper('callout-warning -> "Check totals before saving"'),
    ).toEqual({
      helperKind: "callout-warning",
      helperText: "Check totals before saving",
    });
  });

  it("returns undefined for unknown helper kinds", () => {
    expect(parseBlueprintHelper("video -> 'unsupported'")).toBeUndefined();
  });
});

describe("resolveWizardProgressVariantFromTheme", () => {
  it("maps visualTheme keywords to steps, bar, or stepper", () => {
    expect(resolveWizardProgressVariantFromTheme("left-rail step list")).toBe(
      "steps",
    );
    expect(resolveWizardProgressVariantFromTheme("top progress bar")).toBe(
      "bar",
    );
    expect(resolveWizardProgressVariantFromTheme("compact stepper")).toBe(
      "stepper",
    );
    expect(resolveWizardProgressVariantFromTheme("plain card")).toBeUndefined();
  });

  it("keeps blueprintPrefersStepperProgress compatibility", () => {
    expect(blueprintPrefersStepperProgress("compact stepper")).toBe(true);
    expect(blueprintPrefersStepperProgress("left-rail step list")).toBe(false);
  });
});

describe("translateBlueprintToWizardSteps", () => {
  const blueprint: FormBlueprint = {
    conceptName: "Contract wizard",
    presentation: "wizard",
    steps: [
      {
        id: "basics",
        label: "Basics",
        maxFields: 2,
        helper: "info-box -> 'Start with identifiers'",
      },
      { id: "parties", label: "Parties", maxFields: 2 },
      { id: "terms", label: "Terms", maxFields: 2 },
      { id: "review", label: "Review", readOnly: true },
    ],
  };

  it("buckets fields respecting maxFields and leaves review empty", () => {
    const steps = translateBlueprintToWizardSteps(blueprint, formFields);

    expect(steps).toHaveLength(4);
    expect(steps[0]?.fieldPaths).toEqual(["name", "contractType"]);
    expect(steps[1]?.fieldPaths).toEqual(["providerId", "categoryId"]);
    expect(steps[2]?.fieldPaths).toEqual(["currency", "status", "notes"]);
    expect(steps[3]?.fieldPaths).toEqual([]);
    expect(steps[3]?.readOnly).toBe(true);
  });

  it("maps helper metadata onto steps", () => {
    const steps = translateBlueprintToWizardSteps(blueprint, formFields);

    expect(steps[0]?.helperKind).toBe("info-box");
    expect(steps[0]?.helperText).toBe("Start with identifiers");
  });

  it("spills leftover fields into the last editable step up to four fields", () => {
    const steps = translateBlueprintToWizardSteps(
      {
        ...blueprint,
        steps: [
          { id: "chunk", label: "Chunk", maxFields: 2 },
          { id: "review", label: "Review", readOnly: true },
        ],
      },
      formFields,
    );

    expect(steps[0]?.fieldPaths).toEqual([
      "name",
      "contractType",
      "providerId",
      "categoryId",
    ]);
    expect(steps[1]?.fieldPaths).toEqual([]);
  });
});
