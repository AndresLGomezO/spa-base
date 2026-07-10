import { describe, expect, it } from "vitest";

import { componentRowSchema } from "@repo/ui-builder-core";

describe("componentRowSchema view filter components", () => {
  it("parses view-search rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-search",
      component: {
        kind: "view-search",
        placeholder: "Search…",
      },
    });

    expect(parsed).toMatchObject({
      component: {
        kind: "view-search",
        placeholder: "Search…",
      },
    });
  });

  it("parses view-filters rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-filters",
      component: {
        kind: "view-filters",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });

    expect(parsed).toMatchObject({
      component: {
        kind: "view-filters",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });
  });

  it("parses view-date-filter rows", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-date-filter",
      component: {
        kind: "view-date-filter",
        dateFilterGranularity: "month",
        dateFilterParam: "month",
        label: {
          show: true,
          text: "Period",
          position: "below",
        },
      },
    });

    expect(parsed).toMatchObject({
      component: {
        kind: "view-date-filter",
        dateFilterGranularity: "month",
        dateFilterParam: "month",
        label: {
          show: true,
          text: "Period",
          position: "below",
        },
      },
    });
  });
});
