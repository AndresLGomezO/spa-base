import {
  addComponentRowAt,
  collectLayoutFieldPaths,
  createDefaultComponent,
  createEmptyLayout,
  type FormFieldComponentConfig,
} from "@repo/ui-builder-core";
import { createDefaultFormLayout } from "@repo/entities";
import { describe, expect, it } from "vitest";

import { buildFormSubmitValues } from "./entity-form-payload";
import {
  collectFormRenderedFieldRoots,
  collectOrphanFieldErrors,
  findWizardStepIndexForFieldRoot,
} from "./collect-form-rendered-field-roots";

const definition = {
  name: "transaction",
  collection: "transactions",
  permissions: ["transaction.read"],
  fields: {
    categoryId: { type: "string", required: true, optional: false },
    type: { type: "enum", required: true, optional: false },
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { layout: createDefaultFormLayout(["name"]) },
      edit: { layout: createDefaultFormLayout(["name"]) },
    },
  },
} as const;

function createHiddenFormField(fieldPath: string): FormFieldComponentConfig {
  return {
    kind: "form-field",
    fieldPath,
    hidden: true,
  };
}

describe("collectFormRenderedFieldRoots", () => {
  it("excludes hidden form fields from rendered roots", () => {
    const locator = { scope: "root" as const, columnIndex: 0 };
    let layout = createEmptyLayout(1);
    layout = addComponentRowAt(layout, locator, createHiddenFormField("name"));
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("form-field", "categoryId"),
    );

    const renderedRoots = collectFormRenderedFieldRoots({
      layouts: [layout],
      definition,
      fieldAccess: {},
      canRead: true,
    });

    expect(renderedRoots.has("name")).toBe(false);
    expect(renderedRoots.has("categoryId")).toBe(true);
  });
});

describe("collectOrphanFieldErrors", () => {
  it("returns errors for fields that are not rendered", () => {
    const orphanErrors = collectOrphanFieldErrors(
      {
        categoryId: "Invalid input: expected string, received undefined",
        name: "Name is required.",
      },
      new Set(["name"]),
    );

    expect(orphanErrors).toEqual({
      categoryId: "Invalid input: expected string, received undefined",
    });
  });
});

describe("findWizardStepIndexForFieldRoot", () => {
  it("finds the wizard step containing a field root", () => {
    const locator = { scope: "root" as const, columnIndex: 0 };
    const stepOne = createEmptyLayout(1);
    const stepTwo = addComponentRowAt(
      createEmptyLayout(1),
      locator,
      createDefaultComponent("form-field", "categoryId"),
    );

    const stepIndex = findWizardStepIndexForFieldRoot(
      [{ layout: stepOne }, { layout: stepTwo }],
      "categoryId",
    );

    expect(stepIndex).toBe(1);
  });
});

describe("hidden form fields in submit payload", () => {
  it("includes hidden layout fields in submit values", () => {
    const locator = { scope: "root" as const, columnIndex: 0 };
    let layout = createEmptyLayout(1);
    layout = addComponentRowAt(
      layout,
      locator,
      createHiddenFormField("categoryId"),
    );
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent("form-field", "name"),
    );

    const fieldPaths = collectLayoutFieldPaths(layout);
    const payload = buildFormSubmitValues(fieldPaths, {
      categoryId: "cat_123",
      name: "Payment",
    });

    expect(payload).toEqual({
      categoryId: "cat_123",
      name: "Payment",
    });
  });
});
