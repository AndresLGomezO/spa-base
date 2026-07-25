import { describe, expect, it } from "vitest";

import { uiLayoutDocumentSchema } from "./ui-layout-schema.js";

const minimalRoot = {
  type: "root" as const,
  id: "root-1",
  columnCount: 1,
  columns: [
    {
      id: "col-1",
      rows: [
        {
          type: "component" as const,
          id: "row-1",
          component: {
            kind: "container" as const,
            rows: [],
          },
        },
      ],
    },
  ],
};

describe("uiLayoutDocumentSchema summaryField", () => {
  it("accepts an omitted summaryField", () => {
    expect(uiLayoutDocumentSchema.parse({ root: minimalRoot })).toEqual({
      root: minimalRoot,
    });
  });

  it("accepts a non-empty summaryField", () => {
    expect(
      uiLayoutDocumentSchema.parse({
        root: minimalRoot,
        summaryField: "notes",
      }),
    ).toMatchObject({ summaryField: "notes" });
  });

  it("rejects an empty summaryField", () => {
    expect(() =>
      uiLayoutDocumentSchema.parse({
        root: minimalRoot,
        summaryField: "   ",
      }),
    ).toThrow();
  });
});

describe("uiLayoutDocumentSchema summary", () => {
  it("accepts a valid summary config", () => {
    expect(
      uiLayoutDocumentSchema.parse({
        root: minimalRoot,
        summary: {
          sourceEntity: "portfolioSettings",
          sourceRecordId: "rec-1",
          tabs: [
            { id: "overview", label: "General", field: "aiSummaryText" },
            { id: "loans", label: "Préstamos", field: "loansAiSummaryText" },
          ],
        },
      }),
    ).toMatchObject({
      summary: {
        sourceEntity: "portfolioSettings",
        sourceRecordId: "rec-1",
        tabs: [
          { id: "overview", label: "General", field: "aiSummaryText" },
          { id: "loans", label: "Préstamos", field: "loansAiSummaryText" },
        ],
      },
    });
  });

  it("accepts summary without sourceRecordId", () => {
    expect(
      uiLayoutDocumentSchema.parse({
        root: minimalRoot,
        summary: {
          sourceEntity: "portfolioSettings",
          tabs: [{ id: "overview", label: "General", field: "aiSummaryText" }],
        },
      }),
    ).toMatchObject({
      summary: {
        sourceEntity: "portfolioSettings",
        tabs: [{ id: "overview", label: "General", field: "aiSummaryText" }],
      },
    });
  });

  it("rejects summary with empty tabs", () => {
    expect(() =>
      uiLayoutDocumentSchema.parse({
        root: minimalRoot,
        summary: {
          sourceEntity: "portfolioSettings",
          tabs: [],
        },
      }),
    ).toThrow();
  });

  it("rejects summary with blank sourceEntity", () => {
    expect(() =>
      uiLayoutDocumentSchema.parse({
        root: minimalRoot,
        summary: {
          sourceEntity: "   ",
          tabs: [{ id: "overview", label: "General", field: "aiSummaryText" }],
        },
      }),
    ).toThrow();
  });
});
