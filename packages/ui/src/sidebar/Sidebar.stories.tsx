import type { Meta, StoryObj } from "@storybook/react";

import {
  SidebarMenuButton,
  SidebarMenuIcon,
  SidebarProvider,
} from "../sidebar";
import { Text } from "../typography/Text";

const meta = {
  title: "Components/Sidebar",
  component: SidebarMenuButton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="bg-sidebar w-64 rounded-lg p-2">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof SidebarMenuButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarMenuButton>
      <SidebarMenuIcon>
        <span>⌂</span>
      </SidebarMenuIcon>
      <Text>Home</Text>
    </SidebarMenuButton>
  ),
};

export const Active: Story = {
  render: () => (
    <SidebarMenuButton isActive>
      <SidebarMenuIcon>
        <span>⌂</span>
      </SidebarMenuIcon>
      <Text>Home</Text>
    </SidebarMenuButton>
  ),
};
