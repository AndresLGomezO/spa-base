import {
  useCallback,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton";
import { OverlayRoot } from "../overlay/OverlayRoot";
import { overlayTransitionStyle } from "../overlay/overlay-motion";
import {
  useOverlayTransitionDurationMs,
  useOverlayTransitionVisible,
} from "../overlay/useOverlayTransition";

export interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: "sm" | "md" | "lg" | "xl" | "2xl";
  readonly scrollable?: boolean;
  readonly showCloseButton?: boolean;
  readonly closeLabel?: string;
  readonly layer?: "default" | "nested";
}

const panelSizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
  "2xl": "max-w-[96rem]",
} as const;

function ModalPanel({
  titleId,
  title,
  children,
  footer,
  size,
  scrollable,
  showCloseButton,
  closeLabel,
  onClose,
  panelRef,
}: {
  readonly titleId: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size: NonNullable<ModalProps["size"]>;
  readonly scrollable: boolean;
  readonly showCloseButton: boolean;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly panelRef: RefObject<HTMLDivElement | null>;
}) {
  const visible = useOverlayTransitionVisible();
  const durationMs = useOverlayTransitionDurationMs();
  const animate = durationMs > 0;
  const useStickyLayout = scrollable || Boolean(footer);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        "border-border bg-popover text-popover-foreground pointer-events-auto relative flex w-full origin-center flex-col rounded-xl border shadow-xl",
        panelSizeClasses[size],
        useStickyLayout && "max-h-[min(90vh,calc(100vh-2rem))]",
        !useStickyLayout && "p-5",
        animate &&
          (visible ? "scale-100 opacity-100" : "scale-[0.92] opacity-0"),
      )}
      style={overlayTransitionStyle(durationMs, "opacity-transform")}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          "flex shrink-0 items-start justify-between gap-3",
          useStickyLayout ? "border-border border-b px-5 py-4" : "mb-4",
        )}
      >
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
      <div
        className={cn(
          "flex flex-col gap-4",
          useStickyLayout &&
            (scrollable
              ? "min-h-0 flex-1 overflow-y-auto px-5 py-4"
              : "min-h-0 flex-1 overflow-hidden px-5 py-4"),
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="border-border flex shrink-0 justify-end gap-2 border-t px-5 py-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "sm",
  scrollable = false,
  showCloseButton = true,
  closeLabel = "Close dialog",
  layer = "default",
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
      layer={layer}
      contentClassName="flex items-center justify-center p-4"
      focusPanel={focusPanel}
    >
      <ModalPanel
        titleId={titleId}
        title={title}
        footer={footer}
        size={size}
        scrollable={scrollable}
        showCloseButton={showCloseButton}
        closeLabel={closeLabel}
        onClose={onClose}
        panelRef={panelRef}
      >
        {children}
      </ModalPanel>
    </OverlayRoot>
  );
}
