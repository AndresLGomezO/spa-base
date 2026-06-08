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

export type ModalContentPadding = "default" | "none";

export type ModalVariant = "overlay" | "inline";

export interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: "sm" | "md" | "lg" | "xl" | "2xl";
  readonly scrollable?: boolean;
  readonly showHeader?: boolean;
  readonly showCloseButton?: boolean;
  readonly contentPadding?: ModalContentPadding;
  readonly closeLabel?: string;
  readonly layer?: "default" | "nested";
  /** Inline renders the dialog panel in place without a portal or backdrop. */
  readonly variant?: ModalVariant;
}

export const MODAL_PANEL_MAX_HEIGHT = "min(90vh, calc(100vh - 2rem))";

export function modalContentIsScrollable(options: {
  readonly scrollable: boolean;
}): boolean {
  return options.scrollable;
}

export function modalPanelViewportStyle(options: {
  readonly useStickyLayout: boolean;
}): { readonly maxHeight?: string } {
  if (!options.useStickyLayout) {
    return {};
  }

  return { maxHeight: MODAL_PANEL_MAX_HEIGHT };
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
  showHeader,
  showCloseButton,
  contentPadding,
  closeLabel,
  onClose,
  panelRef,
  embedded = false,
}: {
  readonly titleId: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size: NonNullable<ModalProps["size"]>;
  readonly scrollable: boolean;
  readonly showHeader: boolean;
  readonly showCloseButton: boolean;
  readonly contentPadding: ModalContentPadding;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly embedded?: boolean;
}) {
  const visible = useOverlayTransitionVisible();
  const durationMs = useOverlayTransitionDurationMs();
  const animate = !embedded && durationMs > 0;
  const hasFooter = Boolean(footer);
  const useStickyLayout = scrollable || hasFooter;
  const contentScrollable = modalContentIsScrollable({ scrollable });
  const flushContent = contentPadding === "none";
  const panelViewportStyle = modalPanelViewportStyle({ useStickyLayout });

  return (
    <div
      ref={panelRef}
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-labelledby={titleId}
      className={cn(
        "bg-popover text-popover-foreground pointer-events-auto relative flex w-full origin-center flex-col shadow-xl",
        useStickyLayout && "min-h-0",
        flushContent ? "rounded-xl" : "border-border rounded-xl border",
        panelSizeClasses[size],
        useStickyLayout && !contentScrollable && "overflow-hidden",
        !useStickyLayout && !flushContent && "p-5",
        animate &&
          (visible ? "scale-100 opacity-100" : "scale-[0.92] opacity-0"),
      )}
      style={{
        ...overlayTransitionStyle(durationMs, "opacity-transform"),
        ...panelViewportStyle,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {showHeader ? (
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
      ) : (
        <p id={titleId} className="sr-only">
          {title}
        </p>
      )}
      <div
        className={cn(
          "flex min-h-0 flex-col",
          !flushContent && "gap-4",
          useStickyLayout && "min-h-0 grow",
          useStickyLayout &&
            (contentScrollable ? "overflow-y-auto" : "overflow-hidden"),
          useStickyLayout && !flushContent && "px-5 py-4",
        )}
      >
        {children}
      </div>
      {hasFooter ? (
        <div
          className={cn(
            "border-border relative z-10 flex shrink-0 justify-end gap-2 border-t bg-popover",
            !flushContent && "px-5 py-4",
          )}
        >
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
  showHeader = true,
  showCloseButton = true,
  contentPadding = "default",
  closeLabel = "Close dialog",
  layer = "default",
  variant = "overlay",
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const embedded = variant === "inline";

  const focusPanel = useCallback(() => {
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
  }, []);

  const panel = (
    <ModalPanel
      titleId={titleId}
      title={title}
      footer={footer}
      size={size}
      scrollable={scrollable}
      showHeader={showHeader}
      showCloseButton={showCloseButton}
      contentPadding={contentPadding}
      closeLabel={closeLabel}
      onClose={onClose}
      panelRef={panelRef}
      embedded={embedded}
    >
      {children}
    </ModalPanel>
  );

  if (embedded) {
    if (!open) {
      return null;
    }

    return <div className="w-full">{panel}</div>;
  }

  return (
    <OverlayRoot
      open={open}
      onClose={onClose}
      closeLabel={closeLabel}
      layer={layer}
      contentClassName="flex items-center justify-center p-4"
      focusPanel={focusPanel}
    >
      {panel}
    </OverlayRoot>
  );
}
