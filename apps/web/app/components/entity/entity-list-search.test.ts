import { describe, expect, it } from "vitest";

import type { DataViewColumnDescriptor } from "@repo/data-view";

import { entityHasSearchableColumns } from "./entity-list-search";

describe("entityHasSearchableColumns", () => {
  it("returns true when at least one column is explicitly searchable", () => {
    const columns: Pick<DataViewColumnDescriptor<unknown>, "searchable">[] = [
      { searchable: false },
      { searchable: true },
    ];

    expect(entityHasSearchableColumns(columns)).toBe(true);
  });

  it("returns false when no column is explicitly searchable", () => {
    const columns: Pick<DataViewColumnDescriptor<unknown>, "searchable">[] = [
      { searchable: false },
      { searchable: undefined },
    ];

    expect(entityHasSearchableColumns(columns)).toBe(false);
  });
});
