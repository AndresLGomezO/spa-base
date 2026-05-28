import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@repo/theme/utils";

export type PopoverPlacement =
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

const placementClasses: Record<PopoverPlacement, string> = {
  "top-start": "bottom-full left-0 mb-2 origin-bottom-left",
  "top-end": "bottom-full right-0 mb-2 origin-bottom-right",
  "bottom-start": "top-full left-0 mt-2 origin-top-left",
  "bottom-end": "top-full right-0 mt-2 origin-top-right",
};

export interface PopoverProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly title?: string;
  readonly placement?: PopoverPlacement;
  readonly className?: string;
}

const TRANSITION_MS = 200;

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  title,
  placement = "top-start",
  className,
}: PopoverProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    onOpenChange(!open);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        onClick: (event: MouseEvent<HTMLElement>) => {
          const originalOnClick = (
            trigger as ReactElement<{
              onClick?: (e: MouseEvent<HTMLElement>) => void;
            }>
          ).props.onClick;
          originalOnClick?.(event);
          if (!event.defaultPrevented) {
            toggle();
          }
        },
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": mounted ? titleId : undefined,
      })
    : trigger;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      {triggerElement}

      {mounted ? (
        <div
          id={titleId}
          role="dialog"
          aria-modal="false"
          aria-label={title}
          className={cn(
            "border-border bg-background/95 absolute z-50 w-56 rounded-xl border p-4 shadow-lg ring-1 ring-primary-500/10 backdrop-blur-md transition-all duration-200 ease-out",
            placementClasses[placement],
            visible
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-1 scale-95 opacity-0",
          )}
        >
          {title ? (
            <p className="text-foreground mb-3 text-sm font-semibold">
              {title}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
