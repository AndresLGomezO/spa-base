import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { DataViewToolbar } from "./DataViewToolbar";
import type { DataViewColumnDescriptor } from "./types";

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
    filtersOpen: false,
    onFiltersOpenChange: vi.fn(),
    ...overrides,
  };

  return render(
    <I18nextProvider i18n={i18n}>
      <DataViewToolbar {...props} />
    </I18nextProvider>,
  );
}

describe("DataViewToolbar", () => {
  it("renders search input and filter trigger", () => {
    renderToolbar();

    expect(screen.getByTestId("data-view-search")).toBeInTheDocument();
    expect(screen.getByTestId("filter-panel-trigger")).toBeInTheDocument();
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
});
