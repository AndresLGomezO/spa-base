import { describe, expect, it } from "vitest";

import { resolveViewFilterDateLabel } from "./resolve-view-filter-date-label";

describe("resolveViewFilterDateLabel", () => {
  const baseConfig = {
    kind: "view-date-filter" as const,
  };

  it("uses default text when label is missing", () => {
    expect(resolveViewFilterDateLabel(baseConfig, "Period")).toEqual({
      show: true,
      text: "Period",
      position: "above",
    });
  });

  it("respects hidden labels", () => {
    expect(
      resolveViewFilterDateLabel(
        {
          ...baseConfig,
          label: { show: false, text: "Hidden" },
        },
        "Period",
      ),
    ).toEqual({
      show: false,
      text: "Period",
      position: "above",
    });
  });
});
