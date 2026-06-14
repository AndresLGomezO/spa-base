import { describe, expect, it } from "vitest";

import type { FormBlueprint } from "./forms-blueprint.schema.js";
import { evaluateFormBlueprint } from "./evaluate-form-blueprint.js";

function blueprint(overrides: Partial<FormBlueprint> = {}): FormBlueprint {
  return {
    conceptName: "Guided intake",
    presentation: "wizard",
    visualTheme: "left-rail stepper",
    steps: [
      { id: "basics", label: "Basics", maxFields: 3 },
      {
        id: "details",
        label: "Details",
        maxFields: 3,
        helper: "info-box -> 'Tip'",
      },
      { id: "review", label: "Review", readOnly: true },
    ],
    ...overrides,
  };
}

describe("evaluateFormBlueprint", () => {
  it("accepts a rich wizard blueprint", () => {
    const result = evaluateFormBlueprint(blueprint(), 7);
    expect(result.reject).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("rejects empty conceptName", () => {
    const result = evaluateFormBlueprint(blueprint({ conceptName: "   " }), 7);
    expect(result.reject).toBe(true);
    expect(result.reasons).toContain("conceptName is empty");
  });

  it("rejects plain presentation with a single step", () => {
    const result = evaluateFormBlueprint(
      blueprint({
        presentation: "plain",
        steps: [{ id: "only", label: "Only" }],
      }),
      3,
    );
    expect(result.reject).toBe(true);
    expect(result.reasons).toContain(
      "plain presentation with only one step is too minimal",
    );
  });

  it("rejects maxFields above 6", () => {
    const result = evaluateFormBlueprint(
      blueprint({
        steps: [{ id: "heavy", label: "Heavy", maxFields: 7 }],
      }),
      7,
    );
    expect(result.reject).toBe(true);
    expect(result.reasons.some((reason) => reason.includes("maxFields"))).toBe(
      true,
    );
  });

  it("rejects wizard blueprints with fewer than 2 steps for field-rich entities", () => {
    const result = evaluateFormBlueprint(
      blueprint({
        steps: [{ id: "solo", label: "Solo" }],
      }),
      8,
    );
    expect(result.reject).toBe(true);
    expect(result.reasons).toContain(
      "wizard blueprint needs at least 2 steps for field-rich entities",
    );
  });

  it("rejects low-score minimal blueprints", () => {
    const result = evaluateFormBlueprint(
      blueprint({
        conceptName: "Ok",
        visualTheme: undefined,
        steps: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      }),
      2,
    );
    expect(result.reject).toBe(true);
    expect(result.score).toBeLessThan(3);
  });
});
