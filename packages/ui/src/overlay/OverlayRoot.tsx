import { type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@repo/theme/utils";

import { useOverlayLock } from "./useOverlayLock";
import { overlayTransitionStyle } from "./overlay-motion";
import {
  OverlayTransitionVisibleProvider,
  useOverlayTransition,
} from "./useOverlayTransition";

interface OverlayRootProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly closeLabel?: string;
  readonly overlayClassName?: string;
  readonly contentClassName?: string;
  readonly focusPanel?: () => void;
  readonly children: ReactNode;
}

export function OverlayRoot({
  open,
  onClose,
  overlayClassName,
  contentClassName,
  focusPanel,
  children,
}: OverlayRootProps) {
  const { mounted, visible, durationMs } = useOverlayTransition(open);
  useOverlayLock(mounted, open, onClose, focusPanel);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <OverlayTransitionVisibleProvider visible={visible} durationMs={durationMs}>
      <div
        role="presentation"
        aria-hidden
        className={cn(
          "fixed inset-0 z-50 cursor-default bg-backdrop",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={overlayTransitionStyle(durationMs, "opacity")}
        onClick={onClose}
      />
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-50",
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
