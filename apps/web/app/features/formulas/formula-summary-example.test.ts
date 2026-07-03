import { describe, expect, it } from "vitest";

import {
  buildFormulaExampleInputs,
  evaluateFormulaExampleOutput,
  exampleValueForFormulaInput,
  formatFormulaExampleValue,
} from "./formula-summary-example";

describe("formula-summary-example", () => {
  it("builds named example inputs", () => {
    expect(exampleValueForFormulaInput("rate")).toBe(0.12);
    expect(exampleValueForFormulaInput("quote")).toBe("EA");
    expect(
      buildFormulaExampleInputs({
        inputs: [
          { name: "rate", required: true },
          { name: "quote", required: true },
        ],
      }),
    ).toEqual({ rate: 0.12, quote: "EA" });
  });

  it("formats example values for display", () => {
    expect(formatFormulaExampleValue("EA")).toBe('"EA"');
    expect(formatFormulaExampleValue(0.12)).toBe("0.12");
    expect(formatFormulaExampleValue(null)).toBe("null");
  });

  it("evaluates a simple formula body", () => {
    const definition = {
      id: "f1",
      tenantId: "t1",
      name: "doubleRate",
      inputs: [{ name: "rate", required: true }],
      body: {
        kind: "binary" as const,
        op: "*" as const,
        left: { kind: "input" as const, name: "rate" },
        right: { kind: "literal" as const, value: 2 },
      },
      enabled: true,
      source: "tenant" as const,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(evaluateFormulaExampleOutput(definition, [definition])).toEqual({
      output: "0.24",
    });
  });
});
