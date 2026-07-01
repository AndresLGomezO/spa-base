import { describe, expect, it } from "vitest";

import {
  exportCustomViewFormState,
  importCustomViewFormState,
  resolveQueryIdByName,
  resolveQueryNameById,
} from "./export-custom-view-form-state";

describe("exportCustomViewFormState", () => {
  it("round-trips form settings through portable JSON", () => {
    const exported = exportCustomViewFormState({
      name: "Upcoming payments",
      description: "Expense transactions",
      entityQueryDefinitionName: "Upcoming payments",
      viewId: "upcoming-payments",
      navLabel: "Payments",
      navIcon: "calendar",
      navCategoryId: "cat_finance",
      navOrder: "10",
      hiddenFromNav: false,
      status: "ACTIVE",
      ui: {
        views: [{ type: "table", name: "default", fields: ["type", "date"] }],
        listViewType: "table",
      },
    });

    expect(exported.viewId).toBe("upcoming-payments");
    expect(exported.entityQueryDefinitionName).toBe("Upcoming payments");

    const imported = importCustomViewFormState(exported);
    expect(imported.name).toBe("Upcoming payments");
    expect(imported.navLabel).toBe("Payments");
    expect(imported.ui?.listViewType).toBe("table");
  });

  it("resolves query names and ids", () => {
    const queries = [
      { id: "query_1", name: "Upcoming payments" },
      { id: "query_2", name: "All transactions" },
    ];

    expect(resolveQueryNameById(queries, "query_1")).toBe("Upcoming payments");
    expect(resolveQueryIdByName(queries, "All transactions")).toBe("query_2");
  });
});
