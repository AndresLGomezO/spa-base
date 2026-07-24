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

export interface BottomSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
  readonly title?: string;
  readonly className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const focusPanel = useCallback(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <OverlayRoot open={open} onClose={close} closeLabel="Close" focusPanel={focusPanel}>
      <BottomSheetPanel
        panelRef={panelRef}
        titleId={titleId}
        title={title}
        className={className}
      >
        {children}
      </BottomSheetPanel>
    </OverlayRoot>
  );
}

function BottomSheetPanel({
  panelRef,
  titleId,
  title,
  className,
  children,
}: {
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly titleId: string;
  readonly title?: string;
  readonly className?: string;
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
        "bg-popover text-popover-foreground border-border pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[min(90dvh,40rem)] w-full flex-col rounded-t-2xl border-t shadow-xl",
        "pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
        animate && (visible ? "translate-y-0" : "translate-y-full"),
        !animate && "translate-y-0",
        className,
      )}
      style={overlayTransitionStyle(durationMs, "transform")}
    >
      <div className="bg-muted mx-auto mb-3 h-1 w-10 shrink-0 rounded-full" aria-hidden />
      {title ? (
        <p id={titleId} className="text-foreground mb-3 shrink-0 text-sm font-semibold">
          {title}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
