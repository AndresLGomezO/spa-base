import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { Text } from "../typography/Text";
import { ThirdRailHost } from "./ThirdRailHost";
import { ThirdRailProvider } from "./ThirdRailProvider";
import { useThirdRail } from "./useThirdRail";

const meta = {
  title: "Components/ThirdRail",
  component: ThirdRailProvider,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ThirdRailProvider>;

export default meta;

function ThirdRailShellDemo({
  resizeContent = true,
}: {
  readonly resizeContent?: boolean;
}) {
  const { open, close } = useThirdRail();

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <div className="bg-muted/30 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-6">
        <Text className="mb-4 font-semibold">Main content area</Text>
        <Button
          type="button"
          onClick={() =>
            open({
              title: "Edit record",
              subtitle: "Customer #1042",
              resizeContent,
              body: (
                <div className="space-y-4">
                  {Array.from({ length: 12 }, (_, index) => (
                    <Text key={index}>Scrollable body line {index + 1}</Text>
                  ))}
                </div>
              ),
              footer: (
                <>
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={close}>
                    Save
                  </Button>
                </>
              ),
            })
          }
        >
          Open third rail
        </Button>
      </div>
      <ThirdRailHost />
    </div>
  );
}

function ThirdRailStory({
  resizeContent = true,
}: {
  readonly resizeContent?: boolean;
}) {
  return (
    <ThirdRailProvider>
      <ThirdRailShellDemo resizeContent={resizeContent} />
    </ThirdRailProvider>
  );
}

export const PushLayout: StoryObj = {
  render: () => <ThirdRailStory resizeContent />,
};

export const OverlayLayout: StoryObj = {
  render: () => <ThirdRailStory resizeContent={false} />,
};

export const Interactive: StoryObj = {
  render: () => {
    const [resizeContent, setResizeContent] = useState(true);

    return (
      <ThirdRailProvider>
        <div className="border-border flex items-center gap-2 border-b p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={resizeContent}
              onChange={(event) => setResizeContent(event.target.checked)}
            />
            Resize main content (push layout)
          </label>
        </div>
        <ThirdRailShellDemo resizeContent={resizeContent} />
      </ThirdRailProvider>
    );
  },
};
