import type { Meta, StoryObj } from "@storybook/react";

import { Heading } from "./Heading";

const meta = {
  title: "Components/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: {
    children: "Welcome Back",
    level: 1,
  },
  argTypes: {
    level: {
      control: "select",
      options: [1, 2, 3],
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = {};

export const Level2: Story = {
  args: { level: 2, children: "Section title" },
};

export const Level3: Story = {
  args: { level: 3, children: "Subsection title" },
};
