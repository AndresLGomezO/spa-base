import type { Meta, StoryObj } from "@storybook/react";

import { FilterValueBadge } from "./FilterValueBadge";

const meta = {
  title: "Components/FilterValueBadge",
  component: FilterValueBadge,
  tags: ["autodocs"],
  args: {
    label: "Status: Open",
    removeAriaLabel: "Remove Status: Open",
    onRemove: () => undefined,
  },
} satisfies Meta<typeof FilterValueBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
