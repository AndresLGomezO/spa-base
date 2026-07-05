import { describe, expect, it } from "vitest";

import { resolveViewFilterDateLabel } from "./resolve-view-filter-date-label";

describe("resolveViewFilterDateLabel", () => {
  const baseConfig = {
    kind: "view-filter" as const,
    filters: [],
  };

  it("shows the default label above when dateFilterLabel is omitted", () => {
    expect(resolveViewFilterDateLabel(baseConfig, "Date")).toEqual({
      show: true,
      text: "Date",
      position: "above",
    });
  });

  it("hides the label when show is false", () => {
    expect(
      resolveViewFilterDateLabel(
        {
          ...baseConfig,
          dateFilterLabel: { show: false },
        },
        "Date",
      ),
    ).toMatchObject({
      show: false,
      position: "above",
    });
  });

  it("uses custom text and position when configured", () => {
    expect(
      resolveViewFilterDateLabel(
        {
          ...baseConfig,
          dateFilterLabel: {
            show: true,
            text: "Reporting period",
            position: "below",
            bold: true,
            align: "center",
          },
        },
        "Date",
      ),
    ).toEqual({
      show: true,
      text: "Reporting period",
      position: "below",
      bold: true,
      align: "center",
    });
  });

  it("falls back to the default text when custom text is blank", () => {
    expect(
      resolveViewFilterDateLabel(
        {
          ...baseConfig,
          dateFilterLabel: { show: true, text: "   " },
        },
        "Date",
      ).text,
    ).toBe("Date");
  });
});
