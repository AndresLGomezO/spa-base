import { describe, expect, it } from "vitest";

import { buildFormulaPreviewModel } from "./build-formula-preview-model.js";
import type {
  FormulaPreviewBuildContext,
  FormulaPreviewInput,
} from "./formula-preview-types.js";

function mockContext(
  overrides: Partial<FormulaPreviewBuildContext> = {},
): FormulaPreviewBuildContext {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (options) {
      return `${key}:${JSON.stringify(options)}`;
    }
    return key;
  };
  return { t, ...overrides };
}

function sampleInput(
  overrides: Partial<FormulaPreviewInput> = {},
): FormulaPreviewInput {
  return {
    definition: {
      id: "f1",
      tenantId: "t1",
      name: "annuityPayment",
      description: "Fixed payment",
      inputs: [
        { name: "principal", required: true },
        { name: "rate", required: false, description: "Rate per period" },
      ],
      body: { kind: "literal", value: 100 },
      enabled: true,
      source: "platform",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    summaryText: "Fixed payment for equal installments",
    detailBullets: ["Uses principal, rate, and periods"],
    exampleInputs: { principal: "1000", rate: "0.01" },
    exampleOutput: "33.21",
    exampleOutputError: null,
    ...overrides,
  };
}

describe("buildFormulaPreviewModel", () => {
  it("builds purpose, inputs, output, and expression steps", () => {
    const model = buildFormulaPreviewModel(sampleInput(), mockContext());

    expect(model.steps.map((step) => step.kind)).toEqual([
      "purpose",
      "inputs",
      "output",
      "expression",
    ]);
    expect(model.metaChips).toEqual([
      "formulas.summaryModal.sourcePlatform",
      "formulas.settings.enabled",
    ]);
    expect(model.steps[0]?.summary).toBe(
      "Fixed payment for equal installments",
    );
    expect(model.steps[1]?.bullets?.length).toBe(2);
    expect(model.steps[2]?.summary).toBe("formulas.preview.steps.outputReady");
  });

  it("handles formulas with no inputs and unavailable output", () => {
    const model = buildFormulaPreviewModel(
      sampleInput({
        definition: {
          ...sampleInput().definition,
          inputs: [],
          source: "tenant",
          enabled: false,
        },
        exampleOutput: null,
        exampleOutputError: null,
        detailBullets: [],
      }),
      mockContext(),
    );

    expect(model.steps[1]?.summary).toBe("formulas.summaryModal.noInputs");
    expect(model.steps[2]?.summary).toBe(
      "formulas.summaryModal.outputUnavailable",
    );
    expect(model.metaChips).toEqual([
      "formulas.summaryModal.sourceTenant",
      "formulas.settings.disabled",
    ]);
  });
});
