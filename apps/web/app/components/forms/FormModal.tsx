import type { ReactNode } from "react";

import {
  Modal,
  type ModalContentPadding,
  type ModalProps,
  type ModalVariant,
} from "@repo/ui";

interface FormModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: ModalProps["size"];
  readonly scrollable?: boolean;
  readonly showHeader?: boolean;
  readonly showCloseButton?: boolean;
  readonly contentPadding?: ModalContentPadding;
  readonly closeLabel?: string;
  readonly layer?: ModalProps["layer"];
  readonly variant?: ModalVariant;
}

export function FormModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  scrollable = true,
  showHeader = true,
  showCloseButton = true,
  contentPadding = "default",
  closeLabel,
  layer = "default",
  variant = "overlay",
}: FormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      size={size}
      scrollable={scrollable}
      showHeader={showHeader}
      showCloseButton={showCloseButton}
      contentPadding={contentPadding}
      closeLabel={closeLabel}
      layer={layer}
      variant={variant}
    >
      {children}
    </Modal>
  );
}
