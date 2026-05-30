import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataViewColumnDescriptor } from "../components/data-view/types";
import { useDataViewControls } from "./useDataViewControls";

interface SampleRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

const items: SampleRow[] = [
  { id: "1", name: "Alpha", status: "Open" },
  { id: "2", name: "Beta", status: "Closed" },
  { id: "3", name: "Gamma", status: "Open" },
];

const columns: readonly DataViewColumnDescriptor<SampleRow>[] = [
  {
    id: "name",
    label: "Name",
    getValue: (row) => row.name,
  },
  {
    id: "status",
    label: "Status",
    getValue: (row) => row.status,
  },
];

describe("useDataViewControls", () => {
  it("filters rows by search query", () => {
    const { result } = renderHook(() => useDataViewControls(items, columns));

    act(() => {
      result.current.setSearch("beta");
    });

    expect(result.current.filteredItems).toEqual([
      { id: "2", name: "Beta", status: "Closed" },
    ]);
  });

  it("filters rows by selected column values", () => {
    const { result } = renderHook(() => useDataViewControls(items, columns));

    act(() => {
      result.current.setFilter("status", ["Open"]);
    });

    expect(result.current.filteredItems).toEqual([
      { id: "1", name: "Alpha", status: "Open" },
      { id: "3", name: "Gamma", status: "Open" },
    ]);
  });

  it("sorts rows by selected column", () => {
    const { result } = renderHook(() => useDataViewControls(items, columns));

    act(() => {
      result.current.setSortColumn("name");
    });

    expect(result.current.filteredItems.map((row) => row.name)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);

    act(() => {
      result.current.toggleSortDirection();
    });

    expect(result.current.filteredItems.map((row) => row.name)).toEqual([
      "Gamma",
      "Beta",
      "Alpha",
    ]);
  });

  it("clears all active controls", () => {
    const { result } = renderHook(() => useDataViewControls(items, columns));

    act(() => {
      result.current.setSearch("alpha");
      result.current.setFilter("status", ["Open"]);
      result.current.setSortColumn("name");
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.search).toBe("");
    expect(result.current.filters).toEqual({});
    expect(result.current.sort.columnId).toBeNull();
    expect(result.current.filteredItems).toHaveLength(3);
  });

  it("uses controlled state when provided", () => {
    const onSearchChange = vi.fn();
    const onClearAll = vi.fn();

    const { result } = renderHook(() =>
      useDataViewControls(items, columns, {
        controlled: {
          search: "beta",
          filters: {},
          sort: { columnId: null, direction: "asc" },
          onSearchChange,
          onFilterChange: vi.fn(),
          onSortColumnChange: vi.fn(),
          onToggleSortDirection: vi.fn(),
          onClearAll,
        },
      }),
    );

    expect(result.current.filteredItems).toEqual([
      { id: "2", name: "Beta", status: "Closed" },
    ]);

    act(() => {
      result.current.setSearch("gamma");
    });

    expect(onSearchChange).toHaveBeenCalledWith("gamma");

    act(() => {
      result.current.clearAll();
    });

    expect(onClearAll).toHaveBeenCalled();
  });
});
