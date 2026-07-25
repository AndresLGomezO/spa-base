import { describe, expect, it } from "vitest";

import {
  createEmptySummaryTab,
  hasAiSummarySurface,
  isAiNarrativeStale,
  narrativeVariantFromSummaryField,
  normalizeSummaryConfig,
  resolveSummaryTabsFromRecord,
} from "./resolve-summary-tabs";

describe("isAiNarrativeStale", () => {
  it("is false without a contextHash", () => {
    expect(isAiNarrativeStale(null)).toBe(false);
    expect(
      isAiNarrativeStale({
        narratives: {
          default: {
            text: "x",
            sourceHash: "a",
            updatedAt: "2026-07-25T00:00:00.000Z",
          },
        },
      }),
    ).toBe(false);
  });

  it("is true when narrative is missing or sourceHash mismatches", () => {
    expect(
      isAiNarrativeStale({
        contextHash: "ctx1",
        narratives: {},
      }),
    ).toBe(true);
    expect(
      isAiNarrativeStale({
        contextHash: "ctx1",
        narratives: {
          default: {
            text: "old",
            sourceHash: "ctx0",
            updatedAt: "2026-07-25T00:00:00.000Z",
          },
        },
      }),
    ).toBe(true);
    expect(
      isAiNarrativeStale(
        {
          contextHash: "ctx1",
          narratives: {
            loans: {
              text: "old",
              sourceHash: "ctx0",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
          },
        },
        "loans",
      ),
    ).toBe(true);
  });

  it("is false when sourceHash matches contextHash", () => {
    expect(
      isAiNarrativeStale({
        contextHash: "ctx1",
        narratives: {
          default: {
            text: "ok",
            sourceHash: "ctx1",
            updatedAt: "2026-07-25T00:00:00.000Z",
          },
        },
      }),
    ).toBe(false);
  });

  it("uses per-variant hashes so sibling tabs stay current", () => {
    expect(
      isAiNarrativeStale(
        {
          contextHash: "loans-ctx",
          variantContextHashes: {
            loans: "loans-ctx",
            incomes: "incomes-ctx",
          },
          narratives: {
            loans: {
              text: "old loans",
              sourceHash: "older",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
            incomes: {
              text: "ok incomes",
              sourceHash: "incomes-ctx",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
          },
        },
        "loans",
      ),
    ).toBe(true);
    expect(
      isAiNarrativeStale(
        {
          contextHash: "loans-ctx",
          variantContextHashes: {
            loans: "loans-ctx",
            incomes: "incomes-ctx",
          },
          narratives: {
            loans: {
              text: "old loans",
              sourceHash: "older",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
            incomes: {
              text: "ok incomes",
              sourceHash: "incomes-ctx",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
          },
        },
        "incomes",
      ),
    ).toBe(false);
  });
});

describe("narrativeVariantFromSummaryField", () => {
  it("parses narratives.<variant>.text and defaults otherwise", () => {
    expect(narrativeVariantFromSummaryField("narratives.loans.text")).toBe(
      "loans",
    );
    expect(narrativeVariantFromSummaryField("narratives.default.text")).toBe(
      "default",
    );
    expect(narrativeVariantFromSummaryField("rag.text")).toBe("default");
    expect(narrativeVariantFromSummaryField(undefined)).toBe("default");
  });
});

describe("hasAiSummarySurface", () => {
  it("is true with text or context", () => {
    expect(hasAiSummarySurface(null, "hello")).toBe(true);
    expect(hasAiSummarySurface({ contextHash: "h", narratives: {} }, "")).toBe(
      true,
    );
    expect(hasAiSummarySurface({ context: { a: 1 }, narratives: {} }, "")).toBe(
      true,
    );
    expect(hasAiSummarySurface(null, "")).toBe(false);
  });
});

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

  it("prefers AI record summary doc over inline record fields", () => {
    expect(
      resolveSummaryTabsFromRecord(
        {
          sourceEntity: "portfolioSettings",
          tabs: [
            { id: "overview", label: "General", field: "aiSummaryText" },
            { id: "loans", label: "Préstamos", field: "loansAiSummaryText" },
            {
              id: "narr",
              label: "Narr",
              field: "narratives.default.text",
            },
          ],
        },
        {
          aiSummaryText: "stale inline",
          loansAiSummaryText: "stale loans",
        },
        {
          narratives: {
            default: {
              text: "  Fresh overview  ",
              sourceHash: "h1",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
            loans: {
              text: "Fresh loans",
              sourceHash: "h1",
              updatedAt: "2026-07-25T00:00:00.000Z",
            },
          },
        },
      ),
    ).toEqual([
      {
        id: "overview",
        label: "General",
        field: "aiSummaryText",
        text: "Fresh overview",
      },
      {
        id: "loans",
        label: "Préstamos",
        field: "loansAiSummaryText",
        text: "Fresh loans",
      },
      {
        id: "narr",
        label: "Narr",
        field: "narratives.default.text",
        text: "Fresh overview",
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
