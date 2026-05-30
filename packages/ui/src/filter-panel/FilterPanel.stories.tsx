import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { FilterPanel } from "./FilterPanel";

const meta = {
  title: "Components/FilterPanel",
  component: FilterPanel,
  tags: ["autodocs"],
  args: {
    triggerLabel: "Filters",
    clearAllLabel: "Clear all",
    removeAriaLabel: (label: string) => `Remove ${label}`,
  },
} satisfies Meta<typeof FilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: () => undefined,
    activeBadges: [],
    children: null,
  },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <FilterPanel
        {...args}
        open={open}
        onOpenChange={setOpen}
        activeBadges={[]}
      >
        <p className="text-sm">Filter content</p>
      </FilterPanel>
    );
  },
};

export const WithBadges: Story = {
  args: {
    open: false,
    onOpenChange: () => undefined,
    activeBadges: [],
    children: null,
  },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <FilterPanel
        {...args}
        open={open}
        onOpenChange={setOpen}
        badgesBelowToolbar
        activeBadges={[
          {
            id: "status:open",
            label: "Status: Open",
            onRemove: () => undefined,
          },
        ]}
      >
        <p className="text-sm">Filter content</p>
      </FilterPanel>
    );
  },
};
