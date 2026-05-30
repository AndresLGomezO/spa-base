import {
  useCallback,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@repo/theme/utils";

import { OverlayRoot } from "../overlay/OverlayRoot";
import { overlayTransitionStyle } from "../overlay/overlay-motion";
import {
  useOverlayTransitionDurationMs,
  useOverlayTransitionVisible,
} from "../overlay/useOverlayTransition";

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
      <SheetPanel
        panelRef={panelRef}
        titleId={titleId}
        title={title}
        side={side}
      >
        {children}
      </SheetPanel>
    </OverlayRoot>
  );
}

function SheetPanel({
  panelRef,
  titleId,
  title,
  side,
  children,
}: {
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly titleId: string;
  readonly title?: string;
  readonly side: NonNullable<SheetProps["side"]>;
  readonly children: ReactNode;
}) {
  const visible = useOverlayTransitionVisible();
  const durationMs = useOverlayTransitionDurationMs();
  const animate = durationMs > 0;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border pointer-events-auto absolute top-0 flex h-full w-(--sidebar-width) flex-col border-r shadow-xl",
        side === "left" ? "left-0" : "right-0",
        animate &&
          (side === "left"
            ? visible
              ? "translate-x-0"
              : "-translate-x-full"
            : visible
              ? "translate-x-0"
              : "translate-x-full"),
        !animate && "translate-x-0",
      )}
      style={overlayTransitionStyle(durationMs, "transform")}
    >
      {title ? (
        <p id={titleId} className="sr-only">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}
