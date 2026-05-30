import { useCallback, useId, useRef, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton";
import { OverlayRoot } from "../overlay/OverlayRoot";

export interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly size?: "sm" | "lg";
  readonly showCloseButton?: boolean;
  readonly closeLabel?: string;
}

const panelSizeClasses = {
  sm: "max-w-sm",
  lg: "max-w-3xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "sm",
  showCloseButton = true,
  closeLabel = "Close dialog",
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const focusPanel = useCallback(() => {
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
  }, []);

  return (
    <OverlayRoot
      open={open}
      onClose={onClose}
      closeLabel={closeLabel}
      contentClassName="flex items-center justify-center p-4"
      focusPanel={focusPanel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "border-border bg-popover text-popover-foreground pointer-events-auto relative w-full rounded-xl border p-5 shadow-xl",
          panelSizeClasses[size],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-foreground text-lg font-semibold">
            {title}
          </h2>
          {showCloseButton ? (
            <IconButton
              label={closeLabel}
              size="sm"
              className="shrink-0"
              onClick={onClose}
            >
              <span aria-hidden className="text-lg leading-none">
                ×
              </span>
            </IconButton>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </OverlayRoot>
  );
}
