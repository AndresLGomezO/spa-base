import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SortControls, type SortControlsSortState } from "./SortControls";

const meta = {
  title: "Components/SortControls",
  component: SortControls,
  tags: ["autodocs"],
  args: {
    options: [
      { id: "name", label: "Name" },
      { id: "status", label: "Status" },
    ],
    sortByLabel: "Sort by",
    sortDefaultLabel: "Default",
    sortAscendingLabel: "Sort ascending",
    sortDescendingLabel: "Sort descending",
  },
} satisfies Meta<typeof SortControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: [],
    sort: { columnId: null, direction: "asc" },
    sortByLabel: "Sort by",
    sortDefaultLabel: "Default",
    sortAscendingLabel: "Ascending",
    sortDescendingLabel: "Descending",
    onColumnChange: () => undefined,
    onDirectionToggle: () => undefined,
  },
  render: (args) => {
    const [sort, setSort] = useState<SortControlsSortState>({
      columnId: null,
      direction: "asc",
    });

    return (
      <SortControls
        {...args}
        sort={sort}
        onColumnChange={(columnId) => setSort({ columnId, direction: "asc" })}
        onDirectionToggle={() =>
          setSort((current) => ({
            ...current,
            direction: current.direction === "asc" ? "desc" : "asc",
          }))
        }
      />
    );
  },
};
