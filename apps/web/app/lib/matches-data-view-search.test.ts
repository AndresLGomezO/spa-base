import { describe, expect, it } from "vitest";

import { matchesDataViewSearch } from "./matches-data-view-search";
import type { DataViewColumnDescriptor } from "../components/data-view/types";

interface SampleRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

const columns: readonly DataViewColumnDescriptor<SampleRow>[] = [
  {
    id: "name",
    label: "Name",
    getValue: (row) => row.name,
  },
  {
    id: "email",
    label: "Email",
    getValue: (row) => row.email,
  },
];

describe("matchesDataViewSearch", () => {
  const row: SampleRow = {
    id: "1",
    name: "Jane Doe",
    email: "jane@example.com",
  };

  it("matches case-insensitively across columns", () => {
    expect(matchesDataViewSearch(row, "jane", columns)).toBe(true);
    expect(matchesDataViewSearch(row, "EXAMPLE", columns)).toBe(true);
    expect(matchesDataViewSearch(row, "doe", columns)).toBe(true);
  });

  it("returns true for empty query", () => {
    expect(matchesDataViewSearch(row, "   ", columns)).toBe(true);
  });

  it("returns false when no column matches", () => {
    expect(matchesDataViewSearch(row, "missing", columns)).toBe(false);
  });

  it("uses getDisplayValue when provided", () => {
    const displayColumns: readonly DataViewColumnDescriptor<SampleRow>[] = [
      {
        id: "name",
        label: "Name",
        getValue: (item) => item.name,
        getDisplayValue: () => "Displayed Name",
      },
    ];

    expect(matchesDataViewSearch(row, "displayed", displayColumns)).toBe(true);
    expect(matchesDataViewSearch(row, "jane", displayColumns)).toBe(false);
  });
});
