import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { IconButton } from "../icon-button/IconButton";
import { Popover } from "./Popover";

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

const meta = {
  title: "Components/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Popover>;

export default meta;

function PopoverDemo({
  placement = "top-start",
}: {
  readonly placement?: "top-start" | "top-end" | "bottom-start" | "bottom-end";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-48 items-end justify-start p-8">
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement={placement}
        title="Settings"
        trigger={
          <IconButton label="Settings" size="md">
            <SettingsIcon />
          </IconButton>
        }
      >
        <p className="text-muted text-xs">
          Use SegmentedSwitch stories for settings controls.
        </p>
      </Popover>
    </div>
  );
}

export const TopStart: StoryObj = {
  render: () => <PopoverDemo placement="top-start" />,
};

export const BottomStart: StoryObj = {
  render: () => <PopoverDemo placement="bottom-start" />,
};
