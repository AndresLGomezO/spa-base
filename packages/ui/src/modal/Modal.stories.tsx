import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { Modal } from "./Modal";

const meta = {
  title: "Components/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Modal>;

export default meta;

function ModalDemo({
  title = "Settings",
  size,
  scrollable,
  children,
}: {
  readonly title?: string;
  readonly size?: "sm" | "md" | "lg" | "xl";
  readonly scrollable?: boolean;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size={size}
        scrollable={scrollable}
      >
        {children}
      </Modal>
    </>
  );
}

export const Default: StoryObj = {
  render: () => (
    <ModalDemo>
      <Button variant="outline" fullWidth>
        English
      </Button>
      <Button variant="outline" fullWidth>
        Dark mode
      </Button>
    </ModalDemo>
  ),
};

export const ScrollableLarge: StoryObj = {
  render: () => (
    <ModalDemo title="Edit record" size="lg" scrollable>
      {Array.from({ length: 24 }, (_, index) => (
        <p key={index} className="text-muted-foreground text-sm">
          Form field block {index + 1}
        </p>
      ))}
    </ModalDemo>
  ),
};
