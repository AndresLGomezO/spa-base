import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SearchableMultiSelectDropdown } from "./SearchableMultiSelectDropdown";

const meta = {
  title: "Components/SearchableMultiSelectDropdown",
  component: SearchableMultiSelectDropdown,
  tags: ["autodocs"],
  args: {
    options: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "pending", label: "Pending" },
    ],
    placeholder: "Select values",
    selectedCountLabel: (count) => `${count} selected`,
    searchPlaceholder: "Search options",
    noResultsLabel: "No results",
    removeAriaLabel: (label) => `Remove ${label}`,
  },
} satisfies Meta<typeof SearchableMultiSelectDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: [],
    selected: [],
    onChange: () => undefined,
    placeholder: "Select values",
    selectedCountLabel: (count) => `${count} selected`,
    searchPlaceholder: "Search options",
    noResultsLabel: "No results",
    removeAriaLabel: (label) => `Remove ${label}`,
  },
  render: (args) => {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <SearchableMultiSelectDropdown
        {...args}
        selected={selected}
        onChange={(values) => setSelected([...values])}
      />
    );
  },
};
