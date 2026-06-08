import { describe, expect, it } from "vitest";
import { createDefaultFormLayout } from "@repo/entities";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  collectStepFieldErrors,
  isEmptyRequiredFieldValue,
  mergeFieldErrors,
  stepHasValidationErrors,
} from "./validate-wizard-step-fields";

const definition = {
  name: "widget",
  collection: "widgets",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    email: { type: "string", required: false, optional: true },
    tags: { type: "string", required: true, optional: false, isArray: true },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
} satisfies SerializableEntityDefinition;

describe("validate-wizard-step-fields", () => {
  it("detects empty required scalar and array values", () => {
    expect(isEmptyRequiredFieldValue(definition.fields.name, "")).toBe(true);
    expect(isEmptyRequiredFieldValue(definition.fields.name, "Jane")).toBe(
      false,
    );
    expect(isEmptyRequiredFieldValue(definition.fields.tags, [])).toBe(true);
    expect(isEmptyRequiredFieldValue(definition.fields.tags, ["a"])).toBe(
      false,
    );
  });

  it("collects required field errors for fields in the step layout", () => {
    const stepLayout = createDefaultFormLayout(["name", "email"]);
    const errors = collectStepFieldErrors({
      stepLayout,
      values: { name: "", email: "jane@example.com" },
      definition,
      formatRequiredMessage: (fieldName) => `${fieldName} is required.`,
    });

    expect(errors).toEqual({ name: "name is required." });
  });

  it("reports validation errors when merged errors include a step field", () => {
    const stepLayout = createDefaultFormLayout(["name", "email"]);
    const merged = mergeFieldErrors(
      { email: "Invalid email." },
      { name: "Name is required." },
    );

    expect(stepHasValidationErrors(stepLayout, merged)).toBe(true);
    expect(
      stepHasValidationErrors(createDefaultFormLayout(["email"]), merged),
    ).toBe(true);
    expect(
      stepHasValidationErrors(createDefaultFormLayout(["tags"]), merged),
    ).toBe(false);
  });
});
