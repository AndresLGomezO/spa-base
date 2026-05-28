import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { Heading } from "../typography/Heading";
import { Text } from "../typography/Text";
import { Logo } from "../logo/Logo";
import { Card } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  args: {
    variant: "glass",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "glass"],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "default",
    children: (
      <>
        <Heading level={2}>Card title</Heading>
        <Text variant="muted">Card body content goes here.</Text>
      </>
    ),
  },
};

export const GlassLoginPreview: Story = {
  args: {
    variant: "glass",
    className: "w-full max-w-md",
    children: (
      <>
        <Logo size="md" />
        <div className="flex flex-col gap-1">
          <Heading level={1}>Welcome Back</Heading>
          <Text variant="muted">Sign in to your account</Text>
        </div>
        <Button variant="outline" size="lg" fullWidth>
          Sign in with Google
        </Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="from-primary-100/40 via-background to-background dark:from-primary-950/30 w-full max-w-md rounded-2xl bg-gradient-to-br p-8">
        <Story />
      </div>
    ),
  ],
};
