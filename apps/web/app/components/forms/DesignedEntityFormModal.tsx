import type { ReactNode } from "react";

import {
  resolveEntityFormModalSizing,
  type EntityUiOverrideForms,
  type FormModalPreviewBreakpoint,
} from "@repo/entities";
import type {
  ModalContentPadding,
  ModalEmbeddedLayout,
  ModalVariant,
} from "@repo/ui";

import { FormModal } from "./FormModal";

interface DesignedEntityFormModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly forms: Pick<
    EntityUiOverrideForms,
    "modalSize" | "modalSizeByBreakpoint"
  >;
  readonly simulatedBreakpoint?: FormModalPreviewBreakpoint;
  readonly scrollable?: boolean;
  readonly showHeader?: boolean;
  readonly showCloseButton?: boolean;
  readonly contentPadding?: ModalContentPadding;
  readonly closeLabel?: string;
  readonly variant?: ModalVariant;
  readonly embeddedLayout?: ModalEmbeddedLayout;
  readonly panelMaxHeight?: string;
}

export function DesignedEntityFormModal({
  forms,
  simulatedBreakpoint,
  ...formModalProps
}: DesignedEntityFormModalProps) {
  const sizing = resolveEntityFormModalSizing(forms, {
    simulatedBreakpoint,
  });

  if (sizing.mode === "simulated") {
    return <FormModal {...formModalProps} size={sizing.size} />;
  }

  return (
    <FormModal {...formModalProps} responsiveSizes={sizing.responsiveSizes} />
  );
}
