import type { ReactNode } from "react";

import { Modal, type ModalProps } from "@repo/ui";

interface FormModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly size?: ModalProps["size"];
  readonly scrollable?: boolean;
  readonly closeLabel?: string;
}

export function FormModal({
  open,
  onClose,
  title,
  children,
  size = "lg",
  scrollable = true,
  closeLabel,
}: FormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      scrollable={scrollable}
      closeLabel={closeLabel}
    >
      {children}
    </Modal>
  );
}
