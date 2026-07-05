import { describe, expect, it } from "vitest";

import { componentRowSchema } from "@repo/ui-builder-core";

describe("componentRowSchema view filter components", () => {
  it("parses legacy view-search rows for backward compatibility", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-search",
      component: {
        kind: "view-search",
      },
    });

    expect(parsed).toMatchObject({
      component: {
        kind: "view-search",
      },
    });
  });

  it("parses unified view-filter rows with search and filter flags", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-filter",
      component: {
        kind: "view-filter",
        enableSearch: true,
        enableFilters: true,
        enableDateFilter: true,
        dateFilterGranularity: "month",
        dateFilterParam: "month",
        dateFilterLabel: {
          show: true,
          text: "Period",
          position: "below",
        },
        searchPlaceholder: "Search…",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });

    expect(parsed).toMatchObject({
      component: {
        kind: "view-filter",
        enableSearch: true,
        enableFilters: true,
        enableDateFilter: true,
        dateFilterGranularity: "month",
        dateFilterParam: "month",
        dateFilterLabel: {
          show: true,
          text: "Period",
          position: "below",
        },
        searchPlaceholder: "Search…",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });
  });
});
