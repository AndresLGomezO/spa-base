import { useCallback, useId, useRef, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { OverlayRoot } from "../overlay/OverlayRoot";

export interface SheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
  readonly title?: string;
  readonly side?: "left" | "right";
}

export function Sheet({
  open,
  onOpenChange,
  children,
  title,
  side = "left",
}: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const focusPanel = useCallback(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <OverlayRoot
      open={open}
      onClose={close}
      closeLabel="Close menu"
      overlayClassName="md:hidden"
      focusPanel={focusPanel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border pointer-events-auto absolute top-0 flex h-full w-(--sidebar-width) flex-col border-r shadow-xl transition-transform duration-200",
          side === "left" ? "left-0" : "right-0",
        )}
      >
        {title ? (
          <p id={titleId} className="sr-only">
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </OverlayRoot>
  );
}
