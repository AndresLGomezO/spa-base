import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@repo/theme/utils";

import {
  computeAnchoredPanelPosition,
  computeSidePanelPosition,
  type SidePopoverPreferredPlacement,
  type SidePopoverResolvedPlacement,
} from "./compute-side-panel-position";

export type PopoverLayer = "default" | "elevated";

export type PopoverPlacement =
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "right-start"
  | "right-end";

const placementClasses: Record<PopoverPlacement, string> = {
  "top-start": "bottom-full left-0 mb-2 origin-bottom-left",
  "top-end": "bottom-full right-0 mb-2 origin-bottom-right",
  "bottom-start": "top-full left-0 mt-2 origin-top-left",
  "bottom-end": "top-full right-0 mt-2 origin-top-right",
  "right-start": "origin-top-left",
  "right-end": "origin-bottom-left",
};

const hiddenOffsetClasses: Record<PopoverPlacement, string> = {
  "top-start": "translate-y-1",
  "top-end": "translate-y-1",
  "bottom-start": "-translate-y-1",
  "bottom-end": "-translate-y-1",
  "right-start": "-translate-x-1",
  "right-end": "-translate-x-1",
};

const sideResolvedHiddenOffsetClasses: Record<
  SidePopoverResolvedPlacement,
  string
> = {
  "right-start": "-translate-x-1",
  "right-end": "-translate-x-1",
  "left-start": "translate-x-1",
  "left-end": "translate-x-1",
  "top-start": "translate-y-1",
  "bottom-start": "-translate-y-1",
};

function isSidePlacement(
  placement: PopoverPlacement,
): placement is SidePopoverPreferredPlacement {
  return placement === "right-start" || placement === "right-end";
}

export interface PopoverProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly title?: string;
  readonly placement?: PopoverPlacement;
  readonly className?: string;
  readonly panelClassName?: string;
  readonly fullWidth?: boolean;
  readonly layer?: PopoverLayer;
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
  panelClassName,
  fullWidth = false,
  layer = "default",
}: PopoverProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [sidePanelStyle, setSidePanelStyle] = useState<CSSProperties>({});
  const [resolvedSidePlacement, setResolvedSidePlacement] =
    useState<SidePopoverResolvedPlacement>(
      isSidePlacement(placement) ? placement : "right-start",
    );

  const useSidePortal = isSidePlacement(placement);
  const usePortal = useSidePortal || layer === "elevated";

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

  useLayoutEffect(() => {
    if (!open || !mounted || !usePortal || !rootRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!rootRef.current || !panelRef.current) {
        return;
      }

      const triggerRect = rootRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const panelWidth = panelRect.width || panelRef.current.offsetWidth;
      const panelHeight = panelRect.height || panelRef.current.offsetHeight;

      if (panelWidth === 0 && panelHeight === 0) {
        return;
      }

      const panelSize = { width: panelWidth, height: panelHeight };

      if (isSidePlacement(placement)) {
        const { style, resolvedPlacement } = computeSidePanelPosition({
          preferred: placement,
          triggerRect,
          panelSize,
        });
        setSidePanelStyle(style);
        setResolvedSidePlacement(resolvedPlacement);
        return;
      }

      const preferred =
        placement === "top-start" || placement === "top-end"
          ? "top-start"
          : "bottom-start";
      const { style, resolvedPlacement } = computeAnchoredPanelPosition({
        preferred,
        triggerRect,
        panelSize,
      });
      setSidePanelStyle(style);
      setResolvedSidePlacement(resolvedPlacement);
    };

    updatePosition();

    const panelElement = panelRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && panelElement
        ? new ResizeObserver(updatePosition)
        : null;

    if (resizeObserver && panelElement) {
      resizeObserver.observe(panelElement);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [layer, mounted, open, placement, usePortal]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
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

  const sidePanelScrollable = usePortal && sidePanelStyle.maxHeight != null;
  const portalZIndexClass = layer === "elevated" ? "z-[80]" : "z-[70]";

  const resolvedPanelClassName = cn(
    "border-border bg-popover/95 text-popover-foreground w-56 rounded-xl border p-4 shadow-lg ring-1 ring-focus/10 backdrop-blur-md transition-all duration-200 ease-out",
    usePortal ? cn("fixed", portalZIndexClass) : "absolute z-50",
    sidePanelScrollable && "overflow-y-auto",
    panelClassName,
    !usePortal && placementClasses[placement],
    visible
      ? "pointer-events-auto translate-x-0 translate-y-0 scale-100 opacity-100"
      : cn(
          "pointer-events-none scale-95 opacity-0",
          usePortal
            ? sideResolvedHiddenOffsetClasses[resolvedSidePlacement]
            : hiddenOffsetClasses[placement],
        ),
  );

  const panel = mounted ? (
    <div
      ref={panelRef}
      id={titleId}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      style={usePortal ? sidePanelStyle : undefined}
      className={resolvedPanelClassName}
    >
      {title ? (
        <p className="text-foreground mb-3 text-sm font-semibold">{title}</p>
      ) : null}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  ) : null;

  const stretchToParent = fullWidth || (className?.includes("w-full") ?? false);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        stretchToParent
          ? "flex w-full min-w-0 flex-col [&>*:first-child]:w-full [&>*:first-child]:min-w-0"
          : "inline-flex",
        className,
      )}
    >
      {triggerElement}
      {usePortal && panel ? createPortal(panel, document.body) : panel}
    </div>
  );
}
