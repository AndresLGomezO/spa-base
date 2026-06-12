import type { ReactNode } from "react";

import {
  Modal,
  type ModalContentPadding,
  type ModalEmbeddedLayout,
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
  readonly responsiveSizes?: ModalProps["responsiveSizes"];
  readonly scrollable?: boolean;
  readonly showHeader?: boolean;
  readonly showCloseButton?: boolean;
  readonly contentPadding?: ModalContentPadding;
  readonly closeLabel?: string;
  readonly layer?: ModalProps["layer"];
  readonly variant?: ModalVariant;
  readonly embeddedLayout?: ModalEmbeddedLayout;
  readonly panelMaxHeight?: string;
}

export function FormModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  responsiveSizes,
  scrollable = true,
  showHeader = true,
  showCloseButton = true,
  contentPadding = "default",
  closeLabel,
  layer = "default",
  variant = "overlay",
  embeddedLayout,
  panelMaxHeight,
}: FormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      size={size}
      responsiveSizes={responsiveSizes}
      scrollable={scrollable}
      showHeader={showHeader}
      showCloseButton={showCloseButton}
      contentPadding={contentPadding}
      closeLabel={closeLabel}
      layer={layer}
      variant={variant}
      embeddedLayout={embeddedLayout}
      panelMaxHeight={panelMaxHeight}
    >
      {children}
    </Modal>
  );
}
