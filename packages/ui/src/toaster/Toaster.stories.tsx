import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";

import { Button } from "../button/Button";
import { Toaster } from "./Toaster";

const meta = {
  title: "Components/Toaster",
  component: Toaster,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => toast.success("Saved successfully")}>
        Success
      </Button>
      <Button type="button" onClick={() => toast.error("Something went wrong")}>
        Error
      </Button>
      <Button type="button" onClick={() => toast.info("Heads up")}>
        Info
      </Button>
      <Button type="button" onClick={() => toast.warning("Check your input")}>
        Warning
      </Button>
      <Button
        type="button"
        onClick={() => {
          const id = toast.loading("Saving…");
          setTimeout(() => toast.success("Done", { id }), 1500);
        }}
      >
        Loading
      </Button>
    </div>
  ),
};
