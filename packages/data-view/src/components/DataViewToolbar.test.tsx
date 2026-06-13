import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { DataViewToolbar } from "./DataViewToolbar";
import type { DataViewColumnDescriptor, DataViewToolbarLabels } from "../types";

interface SampleRow {
  readonly id: string;
  readonly name: string;
}

const columns: readonly DataViewColumnDescriptor<SampleRow>[] = [
  {
    id: "name",
    label: "Name",
    getValue: (row) => row.name,
  },
];

const labels: DataViewToolbarLabels = {
  searchPlaceholder: "Search",
  filtersTrigger: "Filters",
  filtersClearAll: "Clear all",
  removeBadge: (label) => `Remove ${label}`,
  filterPlaceholder: "Select values",
  filterSearchPlaceholder: "Search options",
  filterSelectedCount: (count) => `${count} selected`,
  noFilterResults: "No results",
  sortBy: "Sort by",
  sortDefault: "Default",
  sortAscending: "Ascending",
  sortDescending: "Descending",
};

function renderToolbar(
  overrides: Partial<ComponentProps<typeof DataViewToolbar<SampleRow>>> = {},
) {
  const props = {
    search: "",
    setSearch: vi.fn(),
    filters: {},
    setFilter: vi.fn(),
    sort: { columnId: null, direction: "asc" as const },
    setSortColumn: vi.fn(),
    toggleSortDirection: vi.fn(),
    filterOptions: { name: [{ value: "Alpha", label: "Alpha" }] },
    activeBadges: [],
    clearAll: vi.fn(),
    columns,
    labels,
    filtersOpen: false,
    onFiltersOpenChange: vi.fn(),
    ...overrides,
  };

  return render(<DataViewToolbar {...props} />);
}

describe("DataViewToolbar", () => {
  it("renders search input and filter trigger", () => {
    renderToolbar();

    expect(screen.getAllByTestId("data-view-search")).toHaveLength(2);
    expect(screen.getByTestId("filter-panel-trigger")).toBeInTheDocument();
    expect(
      screen.getByTestId("data-view-toolbar-search-row"),
    ).toBeInTheDocument();
  });

  it("shows active badges and clears filters", () => {
    const clearAll = vi.fn();

    renderToolbar({
      activeBadges: [
        {
          id: "name:Alpha",
          label: "Name: Alpha",
          onRemove: vi.fn(),
        },
      ],
      clearAll,
      filtersOpen: true,
    });

    expect(screen.getByText("Name: Alpha")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("filter-panel-clear-all"));
    expect(clearAll).toHaveBeenCalled();
  });

  it("closes filters when clicking outside the panel", () => {
    const onFiltersOpenChange = vi.fn();

    renderToolbar({
      filtersOpen: true,
      onFiltersOpenChange,
    });

    fireEvent.pointerDown(document.body);
    expect(onFiltersOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes filters when touching outside the panel", () => {
    const onFiltersOpenChange = vi.fn();

    renderToolbar({
      filtersOpen: true,
      onFiltersOpenChange,
    });

    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(onFiltersOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close filters when clicking inside the panel", () => {
    const onFiltersOpenChange = vi.fn();

    renderToolbar({
      filtersOpen: true,
      onFiltersOpenChange,
    });

    fireEvent.pointerDown(screen.getByTestId("filter-panel-trigger"));
    expect(onFiltersOpenChange).not.toHaveBeenCalled();
  });

  it("renders only active badges in compact mode", () => {
    renderToolbar({
      compact: true,
      activeBadges: [
        {
          id: "name:Alpha",
          label: "Name: Alpha",
          onRemove: vi.fn(),
        },
      ],
    });

    expect(screen.getByText("Name: Alpha")).toBeInTheDocument();
    expect(screen.queryByTestId("data-view-search")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("filter-panel-trigger"),
    ).not.toBeInTheDocument();
  });

  it("renders nothing in compact mode when there are no active badges", () => {
    const { container } = renderToolbar({
      compact: true,
      activeBadges: [],
    });

    expect(container).toBeEmptyDOMElement();
  });
});
