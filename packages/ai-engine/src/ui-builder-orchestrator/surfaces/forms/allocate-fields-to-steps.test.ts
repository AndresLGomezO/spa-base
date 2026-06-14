import { describe, expect, it } from "vitest";

import {
  allocateFieldsDetermistically,
  isUnknownWizardStepIdError,
} from "./allocate-fields-to-steps.js";

describe("allocateFieldsDetermistically", () => {
  const formFields = [
    "name",
    "contractType",
    "providerId",
    "categoryId",
    "currency",
    "status",
    "notes",
  ] as const;

  it("preserves defined step ids and buckets fields", () => {
    const steps = allocateFieldsDetermistically(
      [
        { id: "step-1", label: "Basics" },
        { id: "step-2", label: "Parties" },
        { id: "step-3", label: "Terms" },
        { id: "step-4", label: "Review" },
      ],
      formFields,
    );

    expect(steps.map((step) => step.id)).toEqual([
      "step-1",
      "step-2",
      "step-3",
      "step-4",
    ]);
    expect(steps[0]?.fieldPaths).toEqual([
      "name",
      "contractType",
      "providerId",
      "categoryId",
    ]);
    expect(steps[1]?.fieldPaths).toEqual(["currency", "status", "notes"]);
    expect(steps[2]?.fieldPaths).toEqual([]);
    expect(steps[3]?.fieldPaths).toEqual([]);
    expect(steps[3]?.readOnly).toBe(true);
  });

  it("leaves review step empty when readOnly is set", () => {
    const steps = allocateFieldsDetermistically(
      [
        { id: "a", label: "A" },
        { id: "b", label: "Review", readOnly: true },
      ],
      ["name", "email"],
    );

    expect(steps[1]?.fieldPaths).toEqual([]);
    expect(steps[1]?.readOnly).toBe(true);
  });
});

describe("isUnknownWizardStepIdError", () => {
  it("detects unknown id validation errors", () => {
    expect(
      isUnknownWizardStepIdError('Unknown wizard step id "contract_basics"'),
    ).toBe(true);
    expect(isUnknownWizardStepIdError("Step has more than 4 fields")).toBe(
      false,
    );
  });
});
