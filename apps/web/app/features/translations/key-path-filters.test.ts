import { describe, expect, it } from "vitest";

import {
  collectSegmentOptions,
  keyMatchesSegmentPath,
  keyWithoutRootPrefix,
  pruneSegmentPath,
  setSegmentPathAtDepth,
  splitKeySegments,
  visibleSegmentFilterDepths,
} from "./key-path-filters";

const SAMPLE_KEYS = [
  "chart.Budget status donut.name",
  "chart.Expenses trend chart.name",
  "chart.Expenses trend chart.series.default.label",
  "chart.Total balance trend chart.name",
  "entity.account.fields.currency.ui.label",
  "entity.account.label",
  "entity.loan.label",
  "metric.totalBalance.name",
] as const;

describe("key-path-filters", () => {
  it("splits dotted keys and strips the root prefix for display", () => {
    expect(splitKeySegments("chart.Expenses trend chart.name")).toEqual([
      "chart",
      "Expenses trend chart",
      "name",
    ]);
    expect(keyWithoutRootPrefix("chart.Expenses trend chart.name")).toBe(
      "Expenses trend chart.name",
    );
    expect(keyWithoutRootPrefix("dashboard")).toBe("dashboard");
  });

  it("collects cascading segment options", () => {
    expect(collectSegmentOptions(SAMPLE_KEYS, [], 0)).toEqual([
      "chart",
      "entity",
      "metric",
    ]);
    expect(collectSegmentOptions(SAMPLE_KEYS, [["chart"]], 1)).toEqual([
      "Budget status donut",
      "Expenses trend chart",
      "Total balance trend chart",
    ]);
    expect(
      collectSegmentOptions(
        SAMPLE_KEYS,
        [["chart"], ["Expenses trend chart"]],
        2,
      ),
    ).toEqual(["name", "series"]);
    expect(
      collectSegmentOptions(
        SAMPLE_KEYS,
        [["entity"], ["account"], ["fields"]],
        3,
      ),
    ).toEqual(["currency"]);
  });

  it("matches keys against a multi-depth segment path", () => {
    expect(keyMatchesSegmentPath("chart.Expenses trend chart.name", [])).toBe(
      true,
    );
    expect(
      keyMatchesSegmentPath("chart.Expenses trend chart.name", [["chart"]]),
    ).toBe(true);
    expect(keyMatchesSegmentPath("entity.account.label", [["chart"]])).toBe(
      false,
    );
    expect(
      keyMatchesSegmentPath("chart.Expenses trend chart.series.default.label", [
        ["chart"],
        ["Expenses trend chart"],
        ["series"],
      ]),
    ).toBe(true);
    expect(
      keyMatchesSegmentPath("chart.Expenses trend chart.name", [
        ["chart"],
        ["Expenses trend chart"],
        ["series"],
      ]),
    ).toBe(false);
  });

  it("prunes invalid deeper selections when parents change", () => {
    const path = [
      ["chart"],
      ["Expenses trend chart", "Missing child"],
      ["series"],
    ];
    expect(pruneSegmentPath(SAMPLE_KEYS, path)).toEqual([
      ["chart"],
      ["Expenses trend chart"],
      ["series"],
    ]);

    expect(
      pruneSegmentPath(SAMPLE_KEYS, [["entity"], ["Expenses trend chart"]]),
    ).toEqual([["entity"]]);
  });

  it("setSegmentPathAtDepth truncates and prunes deeper levels", () => {
    const current = [["chart"], ["Expenses trend chart"], ["series"]];
    expect(
      setSegmentPathAtDepth(SAMPLE_KEYS, current, 1, ["Budget status donut"]),
    ).toEqual([["chart"], ["Budget status donut"]]);
    expect(setSegmentPathAtDepth(SAMPLE_KEYS, current, 0, [])).toEqual([]);
    expect(
      setSegmentPathAtDepth(SAMPLE_KEYS, current, 0, ["chart", "entity"]),
    ).toEqual([["chart", "entity"]]);
  });

  it("computes which depth filters should be visible", () => {
    expect(visibleSegmentFilterDepths([])).toEqual([0]);
    expect(visibleSegmentFilterDepths([["chart"]])).toEqual([0, 1]);
    expect(
      visibleSegmentFilterDepths([["chart"], ["Expenses trend chart"]]),
    ).toEqual([0, 1, 2]);
  });
});
