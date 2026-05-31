import { describe, expect, it } from "vitest";

import type { DataViewColumnDescriptor } from "../types";
import { deriveDataViewFilterOptions } from "./derive-data-view-filter-options";

describe("deriveDataViewFilterOptions", () => {
  it("uses raw values for filter options while keeping display labels", () => {
    const columns: DataViewColumnDescriptor<{ dueDate: string }>[] = [
      {
        id: "dueDate",
        label: "Due date",
        getValue: (item) => item.dueDate,
        getDisplayValue: () => "2026-05-31 11:23 PM GMT+0",
      },
    ];

    const options = deriveDataViewFilterOptions(
      [{ dueDate: "2026-05-31T23:23:00.000Z" }],
      columns,
    );

    expect(options.dueDate).toEqual([
      {
        value: "2026-05-31T23:23:00.000Z",
        label: "2026-05-31 11:23 PM GMT+0",
      },
    ]);
  });
});
