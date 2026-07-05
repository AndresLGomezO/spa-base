import { describe, expect, it } from "vitest";

import { resolveComputedMetricParameters } from "./resolve-parameters.js";

describe("resolveComputedMetricParameters", () => {
  it("derives comparison period from current period", () => {
    const resolved = resolveComputedMetricParameters({
      parameters: [
        {
          name: "currentPeriod",
          valueType: "dateBucket",
          granularity: "month",
        },
        {
          name: "comparisonPeriod",
          valueType: "dateBucket",
          granularity: "month",
          deriveFrom: {
            parameter: "currentPeriod",
            shift: { unit: "month", offset: -1 },
          },
        },
      ],
      provided: {
        currentPeriod: "2026-06",
      },
    });

    expect(resolved).toEqual({
      currentPeriod: "2026-06",
      comparisonPeriod: "2026-05",
    });
  });
});
