import { describe, expect, it } from "vitest";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { defineEntity, validateDesignLayoutSlice } from "@repo/entities";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

import { assembleListSliceData } from "./list-assembler.js";
import { repairListLayoutDocument } from "./repair-list-layout-document.js";
import { sanitizeListComponentConfig } from "./sanitize-list-component-config.js";
import type { ListUiBuilderDraft } from "../../types.js";

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    status: { type: "string" },
  },
  ui: {
    nav: { label: "Widgets" },
    views: [{ type: "table", name: "default", fields: ["name", "status"] }],
    forms: {
      create: { layout: createDefaultFormLayout(["name", "status"]) },
      edit: { layout: createDefaultFormLayout(["name", "status"]) },
    },
  },
});

describe("sanitizeListComponentConfig", () => {
  it("repairs text components missing primary.type", () => {
    expect(
      sanitizeListComponentConfig("text", "name", {
        kind: "text",
        primary: { path: "name" },
        label: { show: true },
      }),
    ).toEqual({
      kind: "text",
      primary: { type: "field", path: "name" },
      label: { show: true },
    });
  });

  it("falls back metric-kpi to text", () => {
    expect(
      sanitizeListComponentConfig("metric-kpi", "name", {
        kind: "metric-kpi",
        metricDefinitionId: "",
        groupBindings: {},
        dimensionBindings: {},
      }).kind,
    ).toBe("text");
  });

  it("preserves styles and conditionalStyles from AI output", () => {
    expect(
      sanitizeListComponentConfig("badge", "status", {
        kind: "badge",
        primary: { path: "status" },
        styles: [{ property: "fontWeight", value: "bold" }],
        conditionalStyles: [{ matchValue: "ACTIVE", badgeVariant: "success" }],
        label: {
          show: false,
        },
      }),
    ).toEqual({
      kind: "badge",
      primary: { type: "field", path: "status" },
      styles: [{ property: "fontWeight", value: "bold" }],
      conditionalStyles: [{ matchValue: "ACTIVE", badgeVariant: "success" }],
      label: { show: false },
    });
  });

  it("maps invalid badgeVariant aliases to schema-safe values", () => {
    expect(
      sanitizeListComponentConfig("badge", "contractType", {
        kind: "badge",
        primary: { type: "field", path: "contractType" },
        conditionalStyles: [
          { matchValue: "SAVINGS", badgeVariant: "primary" },
          { matchValue: "BILL", badgeVariant: "not-a-variant" },
        ],
      }),
    ).toEqual({
      kind: "badge",
      primary: { type: "field", path: "contractType" },
      conditionalStyles: [
        { matchValue: "SAVINGS", badgeVariant: "default" },
        { matchValue: "BILL" },
      ],
    });
  });

  it("drops invalid style rules from AI output", () => {
    expect(
      sanitizeListComponentConfig("text", "name", {
        kind: "text",
        primary: { type: "field", path: "name" },
        styles: [
          { property: "fontWeight", value: "bold" },
          { property: "notAProperty", value: "nope" },
        ],
      }),
    ).toEqual({
      kind: "text",
      primary: { type: "field", path: "name" },
      styles: [{ property: "fontWeight", value: "bold" }],
    });
  });
});

import contractCardDraft from "./fixtures/contract-card-draft.fixture.json" with { type: "json" };

describe("card listItem assembly", () => {
  it("passes final validation when AI component configs are partially invalid", () => {
    const draft: ListUiBuilderDraft = {
      surface: "list",
      entityName: "widget",
      userPrompt: "card",
      listViewType: "card",
      layoutTargets: {
        listItem: {
          pathKey: "listItem",
          label: "Card",
          skeleton: [
            {
              kind: "nested-layout",
              columnCount: 2,
              columns: [
                {
                  components: [{ kind: "text", fieldPath: "name" }],
                },
                {
                  components: [{ kind: "badge", fieldPath: "status" }],
                },
              ],
            },
          ],
          componentConfigs: {
            "root/0/col0/0": {
              kind: "text",
              primary: { path: "name" },
            } as never,
            "root/0/col1/0": {
              kind: "badge",
              primary: { path: "status" },
            } as never,
          },
        },
      },
      completedStepIds: [],
    };

    const slice = assembleListSliceData(Widget as never, draft);
    expect(validateDesignLayoutSlice(Widget as never, "list", slice).ok).toBe(
      true,
    );
    expect(uiLayoutDocumentSchema.safeParse(slice.listItem).success).toBe(true);
  });

  it("repairs nested card layouts with empty nested columns", () => {
    const broken = repairListLayoutDocument({
      root: {
        type: "root",
        id: "root-1",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "nested-layout",
                id: "nested-1",
                columnCount: 2,
                columns: [
                  { id: "col-a", rows: [] },
                  {
                    id: "col-b",
                    rows: [
                      {
                        type: "component",
                        id: "row-1",
                        component: {
                          kind: "text",
                          primary: { path: "status" },
                        } as never,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      showActions: true,
      cardsPerRow: 1,
    });

    expect(uiLayoutDocumentSchema.safeParse(broken).success).toBe(true);
  });

  it("passes validation for contract card draft with primary badge variants", () => {
    const slice = assembleListSliceData(
      Widget as never,
      contractCardDraft as ListUiBuilderDraft,
    );
    expect(uiLayoutDocumentSchema.safeParse(slice.listItem).success).toBe(true);
  });
});
