import { describe, expect, it } from "vitest";

import {
  createEmptySummaryTab,
  normalizeSummaryConfig,
  resolveSummaryTabsFromRecord,
} from "./resolve-summary-tabs";

describe("resolveSummaryTabsFromRecord", () => {
  it("returns empty when summary is missing", () => {
    expect(resolveSummaryTabsFromRecord(undefined, { a: "x" })).toEqual([]);
  });

  it("keeps configured tabs even when the record or field text is empty", () => {
    expect(
      resolveSummaryTabsFromRecord(
        {
          sourceEntity: "portfolioSettings",
          tabs: [
            { id: "overview", label: "General", field: "aiSummaryText" },
            { id: "loans", label: "Préstamos", field: "loansAiSummaryText" },
            { id: "empty", label: "Empty", field: "incomesAiSummaryText" },
            { id: "missing", label: "Missing", field: "noSuchField" },
            { id: "num", label: "Num", field: "count" },
            { id: "bad", label: "Bad", field: "  " },
          ],
        },
        {
          aiSummaryText: "  Overview md  ",
          loansAiSummaryText: "Loans md",
          incomesAiSummaryText: "   ",
          count: 3,
        },
      ),
    ).toEqual([
      {
        id: "overview",
        label: "General",
        field: "aiSummaryText",
        text: "Overview md",
      },
      {
        id: "loans",
        label: "Préstamos",
        field: "loansAiSummaryText",
        text: "Loans md",
      },
      {
        id: "empty",
        label: "Empty",
        field: "incomesAiSummaryText",
        text: "",
      },
      {
        id: "missing",
        label: "Missing",
        field: "noSuchField",
        text: "",
      },
      {
        id: "num",
        label: "Num",
        field: "count",
        text: "",
      },
    ]);
  });

  it("still lists tabs when the source record has not loaded yet", () => {
    expect(
      resolveSummaryTabsFromRecord(
        {
          sourceEntity: "portfolioSettings",
          tabs: [{ id: "overview", label: "General", field: "aiSummaryText" }],
        },
        null,
      ),
    ).toEqual([
      {
        id: "overview",
        label: "General",
        field: "aiSummaryText",
        text: "",
      },
    ]);
  });
});

describe("normalizeSummaryConfig", () => {
  it("returns undefined without source entity or usable tabs", () => {
    expect(
      normalizeSummaryConfig({
        sourceEntity: "  ",
        tabs: [{ id: "a", label: "A", field: "x" }],
      }),
    ).toBeUndefined();
    expect(
      normalizeSummaryConfig({
        sourceEntity: "portfolioSettings",
        tabs: [{ id: "a", label: "A", field: "  " }],
      }),
    ).toBeUndefined();
  });

  it("trims and drops blank sourceRecordId", () => {
    expect(
      normalizeSummaryConfig({
        sourceEntity: " portfolioSettings ",
        sourceRecordId: "  ",
        tabs: [
          { id: " overview ", label: " General ", field: " aiSummaryText " },
        ],
      }),
    ).toEqual({
      sourceEntity: "portfolioSettings",
      tabs: [{ id: "overview", label: "General", field: "aiSummaryText" }],
    });
  });
});

describe("createEmptySummaryTab", () => {
  it("creates a numbered placeholder tab", () => {
    expect(createEmptySummaryTab(0)).toEqual({
      id: "tab-1",
      label: "Tab 1",
      field: "",
    });
  });
});
