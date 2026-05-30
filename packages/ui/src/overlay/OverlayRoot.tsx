import { type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@repo/theme/utils";

import { useOverlayLock } from "./useOverlayLock";

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
  closeLabel = "Close dialog",
  overlayClassName,
  contentClassName,
  focusPanel,
  children,
}: OverlayRootProps) {
  useOverlayLock(open, onClose, focusPanel);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label={closeLabel}
        className="fixed inset-0 z-50 bg-neutral-950/50 transition-opacity"
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
    </>,
    document.body,
  );
}
