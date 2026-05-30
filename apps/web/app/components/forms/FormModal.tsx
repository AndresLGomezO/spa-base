import type { ReactNode } from "react";

import { Modal, type ModalProps } from "@repo/ui";

interface FormModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: ModalProps["size"];
  readonly scrollable?: boolean;
  readonly closeLabel?: string;
  readonly layer?: ModalProps["layer"];
}

export function FormModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  scrollable = true,
  closeLabel,
  layer = "default",
}: FormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      size={size}
      scrollable={scrollable}
      closeLabel={closeLabel}
      layer={layer}
    >
      {children}
    </Modal>
  );
}
