import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { EntityPageCompactToolbar } from "./EntityPageCompactToolbar";
import type { WebDataViewToolbar } from "../data-view/WebDataViewToolbar";

vi.mock("../data-view/WebDataViewToolbar", () => ({
  WebDataViewToolbar: ({
    compact,
  }: ComponentProps<typeof WebDataViewToolbar>) => (
    <div data-testid={compact ? "compact-toolbar" : "expanded-toolbar"} />
  ),
}));

const toolbarProps = {
  search: "",
  setSearch: vi.fn(),
  filters: {},
  setFilter: vi.fn(),
  sort: { columnId: null, direction: "asc" as const },
  setSortColumn: vi.fn(),
  toggleSortDirection: vi.fn(),
  filterOptions: {},
  activeBadges: [
    {
      id: "status:open",
      label: "Status: Open",
      onRemove: vi.fn(),
    },
  ],
  clearAll: vi.fn(),
  columns: [],
  filtersOpen: false,
  onFiltersOpenChange: vi.fn(),
};

describe("EntityPageCompactToolbar", () => {
  it("renders only the expanded toolbar", () => {
    render(<EntityPageCompactToolbar toolbar={toolbarProps} />);

    expect(screen.getByTestId("expanded-toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("compact-toolbar")).not.toBeInTheDocument();
  });
});
