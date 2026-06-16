import { describe, expect, it } from "vitest";

import { componentRowSchema } from "@repo/ui-builder-core";

describe("componentRowSchema view filter components", () => {
  it("parses view-search rows without entity configuration", () => {
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

  it("parses configured view-filter rows with filter entries", () => {
    const parsed = componentRowSchema.parse({
      type: "component",
      id: "row-filter",
      component: {
        kind: "view-filter",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });

    expect(parsed).toMatchObject({
      component: {
        kind: "view-filter",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });
  });
});
