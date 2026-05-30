import type { Meta, StoryObj } from "@storybook/react";

import { PageLoader } from "./PageLoader";

const meta = {
  title: "Components/PageLoader",
  component: PageLoader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    ariaLabel: "Loading",
  },
} satisfies Meta<typeof PageLoader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
