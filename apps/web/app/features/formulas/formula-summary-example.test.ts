import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { FormulaDefinitionRecord } from "../../lib/api-client";
import {
  buildFormulaExampleInputs,
  evaluateFormulaExampleOutput,
  exampleValueForFormulaInput,
  formatFormulaExampleValue,
} from "./formula-summary-example";

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../",
);

function loadCatalogRecords(): FormulaDefinitionRecord[] {
  const platform = JSON.parse(
    readFileSync(
      join(repoRoot, "packages/formula-definitions/src/platform-formulas.json"),
      "utf8",
    ),
  ) as { formulaDefinitions: Array<Omit<FormulaDefinitionRecord, "id">> };

  const timestamp = "2026-01-01T00:00:00.000Z";
  return platform.formulaDefinitions.map((entry, index) => ({
    ...entry,
    id: `formula_${index}`,
    tenantId: "tenant_preview",
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

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

  it("evaluates platform formulas from the catalog", () => {
    const catalog = loadCatalogRecords();
    const annuityPayment = catalog.find(
      (entry) => entry.name === "annuityPayment",
    );
    const simpleInterest = catalog.find(
      (entry) => entry.name === "simpleInterest",
    );

    expect(annuityPayment).toBeDefined();
    expect(
      evaluateFormulaExampleOutput(annuityPayment!, catalog).output,
    ).toBeTruthy();

    expect(simpleInterest).toBeDefined();
    expect(
      evaluateFormulaExampleOutput(simpleInterest!, catalog).output,
    ).toBeTruthy();
  });
});
