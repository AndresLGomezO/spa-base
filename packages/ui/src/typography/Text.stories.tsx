import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "./Text";

const meta = {
  title: "Components/Text",
  component: Text,
  tags: ["autodocs"],
  args: {
    children: "Sign in to your account",
    variant: "default",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "muted", "caption"],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = {
  args: { variant: "muted" },
};

export const Caption: Story = {
  args: {
    variant: "caption",
    children: "© 2026 Entity System - ESP. All rights reserved.",
  },
};
