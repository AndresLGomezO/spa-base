import type { Meta, StoryObj } from "@storybook/react";

import { Avatar } from "./Avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: {
    alt: "Jane Doe",
    fallback: "JD",
    size: "md",
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/80?u=avatar-story",
  },
};

export const Fallback: Story = {
  args: {
    src: null,
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    src: null,
    fallback: "AB",
  },
};
