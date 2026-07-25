import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { BottomSheet } from "./BottomSheet";

const meta = {
  title: "Components/BottomSheet",
  component: BottomSheet,
  tags: ["autodocs"],
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;

export const Default: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open bottom sheet</Button>
        <BottomSheet open={open} onOpenChange={setOpen} title="Select period">
          <p className="text-muted-foreground text-sm">
            Sheet content goes here.
          </p>
        </BottomSheet>
      </>
    );
  },
};
