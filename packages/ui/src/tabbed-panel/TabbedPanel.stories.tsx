import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Text } from "../typography/Text";
import { TabbedPanel, type TabbedPanelTabId } from "./TabbedPanel";

const meta = {
  title: "Components/TabbedPanel",
  component: TabbedPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TabbedPanel>;

export default meta;

type Story = StoryObj<typeof TabbedPanel>;

function LongPanelContent({ label }: { readonly label: string }) {
  return (
    <div className="space-y-4 p-1">
      {Array.from({ length: 40 }, (_, index) => (
        <Text key={index}>
          {label} line {index + 1}
        </Text>
      ))}
    </div>
  );
}

function TabbedPanelStory() {
  const [activeTabId, setActiveTabId] = useState<TabbedPanelTabId>("settings");

  return (
    <div className="flex h-dvh overflow-hidden p-6">
      <TabbedPanel
        ariaLabel="Form designer sections"
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        tabs={[
          {
            id: "settings",
            label: "Settings",
            panel: <LongPanelContent label="Settings" />,
          },
          {
            id: "layout",
            label: "Layout",
            panel: <LongPanelContent label="Layout" />,
          },
          {
            id: "components",
            label: "Components",
            panel: <LongPanelContent label="Components" />,
          },
        ]}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <TabbedPanelStory />,
};
