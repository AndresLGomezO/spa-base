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
  children,
}: {
  readonly title?: string;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
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
