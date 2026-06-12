import type { Meta, StoryObj } from "@storybook/react";

import { Avatar } from "./Avatar";

/** Inline fixture for stable visual regression (no external network). */
const AVATAR_STORY_IMAGE_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="#4f46e5"/>
      <circle cx="40" cy="32" r="14" fill="#c7d2fe"/>
      <ellipse cx="40" cy="72" rx="22" ry="16" fill="#c7d2fe"/>
    </svg>`,
  );

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
    src: AVATAR_STORY_IMAGE_SRC,
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
