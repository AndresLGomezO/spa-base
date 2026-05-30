import { describe, expect, it } from "vitest";

import { formatFieldLabel } from "./entity-catalog";

describe("formatFieldLabel", () => {
  it("title-cases camelCase field names", () => {
    expect(formatFieldLabel("openDate")).toBe("Open Date");
    expect(formatFieldLabel("totalPeriods")).toBe("Total Periods");
  });

  it("uses explicit ui label when provided", () => {
    expect(
      formatFieldLabel("amount", {
        name: "loan",
        collection: "loans",
        permissions: [],
        fields: {},
        ui: {
          views: [],
          forms: { create: { sections: [] }, edit: { sections: [] } },
          fields: {
            amount: { label: "Principal" },
          },
        },
      }),
    ).toBe("Principal");
  });
});
