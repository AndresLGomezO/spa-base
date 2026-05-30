import { type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@repo/theme/utils";

import { useOverlayLock } from "./useOverlayLock";
import { overlayTransitionStyle } from "./overlay-motion";
import {
  OverlayTransitionVisibleProvider,
  useOverlayTransition,
} from "./useOverlayTransition";

type OverlayLayer = "default" | "nested";

const overlayLayerClasses: Record<
  OverlayLayer,
  { readonly backdrop: string; readonly content: string }
> = {
  default: {
    backdrop: "z-50 bg-backdrop",
    content: "z-50",
  },
  nested: {
    backdrop: "z-[60] bg-backdrop/80",
    content: "z-[60]",
  },
};

interface OverlayRootProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly closeLabel?: string;
  readonly layer?: OverlayLayer;
  readonly overlayClassName?: string;
  readonly contentClassName?: string;
  readonly focusPanel?: () => void;
  readonly children: ReactNode;
}

export function OverlayRoot({
  open,
  onClose,
  layer = "default",
  overlayClassName,
  contentClassName,
  focusPanel,
  children,
}: OverlayRootProps) {
  const { mounted, visible, durationMs } = useOverlayTransition(open);
  useOverlayLock(mounted, open, onClose, focusPanel);
  const layerClasses = overlayLayerClasses[layer];

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <OverlayTransitionVisibleProvider visible={visible} durationMs={durationMs}>
      <div
        role="presentation"
        aria-hidden
        className={cn(
          "fixed inset-0 cursor-default",
          layerClasses.backdrop,
          visible ? "opacity-100" : "opacity-0",
          overlayClassName,
        )}
        style={overlayTransitionStyle(durationMs, "opacity")}
        onClick={onClose}
      />
      <div
        className={cn(
          "pointer-events-none fixed inset-0",
          layerClasses.content,
          overlayClassName,
        )}
        role="presentation"
      >
        <div className={cn("h-full w-full", contentClassName)}>{children}</div>
      </div>
    </OverlayTransitionVisibleProvider>,
    document.body,
  );
}
