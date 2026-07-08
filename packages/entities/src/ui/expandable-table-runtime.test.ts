import { createDefaultRowExpandLayout } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import { createDefaultExpandableTableView } from "./expandable-table-defaults.js";
import {
  expandableTableExpandFieldPaths,
  expandableTableHasExpandContent,
  expandableTableHasExpandFieldContent,
} from "./expandable-table-runtime.js";

describe("expandableTableHasExpandContent", () => {
  it("is always true for expandable table rows", () => {
    expect(expandableTableHasExpandContent()).toBe(true);
  });
});

describe("expandableTableHasExpandFieldContent", () => {
  it("detects expand fields inside a 3-column grid row expand layout", () => {
    const view = createDefaultExpandableTableView(
      ["name", "status", "amount", "notes", "accountId"],
      {
        fields: {
          name: { type: "string", required: true, optional: false },
          status: { type: "string", required: false, optional: true },
          amount: { type: "number", required: false, optional: true },
          notes: { type: "string", required: false, optional: true },
          accountId: {
            type: "string",
            required: false,
            optional: true,
            relation: { target: "account", type: "many-to-one" },
          },
        },
      },
    );

    expect(
      expandableTableHasExpandFieldContent({
        rowExpandLayout: view.rowExpandLayout,
        columns: view.columns,
      }),
    ).toBe(true);
    expect(
      expandableTableExpandFieldPaths({
        rowExpandLayout: view.rowExpandLayout,
        columns: view.columns,
      }),
    ).toEqual(["notes", "accountId"]);
  });

  it("returns false when all fields are already in the main row", () => {
    const view = createDefaultExpandableTableView(
      ["name", "status", "amount"],
      {
        fields: {
          name: { type: "string", required: true, optional: false },
          status: { type: "string", required: false, optional: true },
          amount: { type: "number", required: false, optional: true },
        },
      },
    );

    expect(
      expandableTableHasExpandFieldContent({
        rowExpandLayout: view.rowExpandLayout,
        columns: view.columns,
      }),
    ).toBe(false);
  });

  it("returns false for an empty expand layout", () => {
    const columns = createDefaultExpandableTableView([
      "name",
      "status",
      "amount",
    ]).columns;

    expect(
      expandableTableHasExpandFieldContent({
        rowExpandLayout: createDefaultRowExpandLayout([]),
        columns,
      }),
    ).toBe(false);
  });
});
