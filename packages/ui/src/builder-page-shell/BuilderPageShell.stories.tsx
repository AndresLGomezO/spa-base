import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { Text } from "../typography/Text";
import { BuilderPageShell } from "./BuilderPageShell";

const meta = {
  title: "Components/BuilderPageShell",
  component: BuilderPageShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof BuilderPageShell>;

export default meta;

type Story = StoryObj<typeof BuilderPageShell>;

function LongBodyContent() {
  return (
    <div className="space-y-4 p-1">
      {Array.from({ length: 40 }, (_, index) => (
        <Text key={index}>Scrollable body line {index + 1}</Text>
      ))}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex h-dvh overflow-hidden p-6">
      <BuilderPageShell
        title="Form Designer"
        subtitle="Entity: Account"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm">
              Open preview
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              Screen size
            </Button>
          </div>
        }
      >
        <LongBodyContent />
      </BuilderPageShell>
    </div>
  ),
};
