import { describe, expect, it, vi } from "vitest";

import { applyTableColumnHeaderSort } from "./apply-table-column-header-sort";

describe("applyTableColumnHeaderSort", () => {
  it("sets a new sort column when clicking a different field", () => {
    const setSortColumn = vi.fn();
    const toggleSortDirection = vi.fn();

    applyTableColumnHeaderSort(
      "amount",
      { columnId: "date", direction: "asc" },
      setSortColumn,
      toggleSortDirection,
    );

    expect(setSortColumn).toHaveBeenCalledWith("amount");
    expect(toggleSortDirection).not.toHaveBeenCalled();
  });

  it("toggles direction when clicking the active sort column", () => {
    const setSortColumn = vi.fn();
    const toggleSortDirection = vi.fn();

    applyTableColumnHeaderSort(
      "amount",
      { columnId: "amount", direction: "desc" },
      setSortColumn,
      toggleSortDirection,
    );

    expect(toggleSortDirection).toHaveBeenCalledOnce();
    expect(setSortColumn).not.toHaveBeenCalled();
  });

  it("sets sort when no column is currently sorted", () => {
    const setSortColumn = vi.fn();
    const toggleSortDirection = vi.fn();

    applyTableColumnHeaderSort(
      "amount",
      { columnId: null, direction: "asc" },
      setSortColumn,
      toggleSortDirection,
    );

    expect(setSortColumn).toHaveBeenCalledWith("amount");
    expect(toggleSortDirection).not.toHaveBeenCalled();
  });
});
