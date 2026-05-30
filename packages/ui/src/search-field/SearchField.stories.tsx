import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SearchField } from "./SearchField";

const meta = {
  title: "Components/SearchField",
  component: SearchField,
  tags: ["autodocs"],
  args: {
    placeholder: "Search...",
    ariaLabel: "Search",
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "",
    onChange: () => undefined,
  },
  render: (args) => {
    const [value, setValue] = useState("");
    return <SearchField {...args} value={value} onChange={setValue} />;
  },
};
