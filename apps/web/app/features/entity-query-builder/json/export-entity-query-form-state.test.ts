import { describe, expect, it } from "vitest";

import {
  exportEntityQueryFormState,
  importEntityQueryFormState,
} from "./export-entity-query-form-state";
import {
  createEmptyEntityQueryFilterRoot,
  createEmptyEntityQuerySortRow,
} from "../../../components/entity/entity-query-filter-utils";

describe("exportEntityQueryFormState", () => {
  it("round-trips draft settings through portable JSON", () => {
    const filter = createEmptyEntityQueryFilterRoot();
    const sort = [createEmptyEntityQuerySortRow()];

    const exported = exportEntityQueryFormState({
      name: "Upcoming payments",
      description: "Expense transactions",
      sourceEntity: "transaction",
      filter,
      sort,
      select: ["type", "date"],
      limitMode: "topN",
      limit: 25,
      status: "ACTIVE",
    });

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
});
