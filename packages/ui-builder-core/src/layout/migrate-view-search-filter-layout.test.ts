import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import { migrateViewSearchFilterLayout } from "./migrate-view-search-filter-layout.js";
import type { ColumnNode } from "../types/layout.js";

function layoutWithRows(rows: ColumnNode["rows"]) {
  return {
    root: {
      type: "root" as const,
      id: "root",
      columnCount: 1,
      columns: [
        {
          id: "col-1",
          rows,
        },
      ],
    },
  };
}

describe("migrateViewSearchFilterLayout", () => {
  it("merges adjacent view-search into the following view-filter row", () => {
    const layout = layoutWithRows([
      {
        type: "component",
        id: "row-search",
        component: {
          kind: "view-search",
          placeholder: "Find items…",
        },
      },
      {
        type: "component",
        id: "row-filter",
        component: {
          kind: "view-filter",
          filters: [{ entityName: "account", fieldName: "accountType" }],
        },
      },
    ]);

    const migrated = migrateViewSearchFilterLayout(layout);

    expect(resolveLayoutRootColumns(migrated)[0]?.rows).toHaveLength(1);
    expect(resolveLayoutRootColumns(migrated)[0]?.rows[0]).toMatchObject({
      id: "row-filter",
      component: {
        kind: "view-filter",
        enableSearch: true,
        searchPlaceholder: "Find items…",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
    });
  });

  it("converts standalone view-search rows into search-only view-filter rows", () => {
    const layout = layoutWithRows([
      {
        type: "component",
        id: "row-search",
        component: {
          kind: "view-search",
          placeholder: "Search…",
        },
      },
    ]);

    const migrated = migrateViewSearchFilterLayout(layout);

    expect(resolveLayoutRootColumns(migrated)[0]?.rows[0]).toMatchObject({
      id: "row-search",
      component: {
        kind: "view-filter",
        enableSearch: true,
        enableFilters: false,
        filters: [],
        searchPlaceholder: "Search…",
      },
    });
  });
});
