import { describe, expect, it } from "vitest";

import {
  exportEntityQueryFormState,
  importEntityQueryFormState,
  validateEntityQueryFormState,
} from "./export-entity-query-form-state";
import {
  createEmptyEntityQueryFilterRoot,
  createEmptyEntityQuerySortRow,
} from "../../../components/entity/entity-query-filter-utils";

const baseExportInput = {
  name: "Upcoming payments",
  description: "Expense transactions",
  sourceEntity: "transaction",
  queryMode: "records" as const,
  parameters: [],
  filter: createEmptyEntityQueryFilterRoot(),
  sort: [createEmptyEntityQuerySortRow()],
  select: ["type", "date"],
  groupBy: [],
  aggregations: [],
  groupSort: [],
  limitMode: "topN" as const,
  limit: 25,
  status: "ACTIVE" as const,
};

describe("exportEntityQueryFormState", () => {
  it("round-trips draft settings through portable JSON", () => {
    const exported = exportEntityQueryFormState(baseExportInput);

    expect(exported.name).toBe("Upcoming payments");
    expect(exported.sourceEntity).toBe("transaction");
    expect(exported.select).toEqual(["type", "date"]);
    expect(exported.limit).toBe(25);

    const imported = importEntityQueryFormState(exported);
    expect(imported.description).toBe("Expense transactions");
    expect(imported.limitMode).toBe("topN");
    expect(imported.limit).toBe(25);
    expect(imported.status).toBe("ACTIVE");
    expect(imported.select).toEqual(["type", "date"]);
  });

  it("exports incomplete aggregated drafts without throwing", () => {
    expect(() =>
      exportEntityQueryFormState({
        ...baseExportInput,
        queryMode: "aggregated",
        limitMode: "all",
        sort: [],
      }),
    ).not.toThrow();
  });

  it("rejects incomplete aggregated drafts on validation", () => {
    const result = validateEntityQueryFormState({
      ...baseExportInput,
      queryMode: "aggregated",
      limitMode: "all",
      sort: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("groupBy");
    }
  });
});
