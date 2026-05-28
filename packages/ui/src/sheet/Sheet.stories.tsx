import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { Sheet } from "./Sheet";

const meta = {
  title: "Components/Sheet",
  component: Sheet,
  tags: ["autodocs"],
} satisfies Meta<typeof Sheet>;

export default meta;

export const LeftDrawer: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Sheet open={open} onOpenChange={setOpen} title="Navigation">
          <div className="p-4">
            <p>Sheet content</p>
          </div>
        </Sheet>
      </>
    );
  },
};
