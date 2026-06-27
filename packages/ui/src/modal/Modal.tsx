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

export type ModalEmbeddedLayout = "centered" | "fill";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

export type ModalResponsiveBreakpoint = "base" | "sm" | "md" | "lg" | "xl";

export type ModalResponsiveSizes = Record<ModalResponsiveBreakpoint, ModalSize>;

export interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: ModalSize;
  readonly responsiveSizes?: ModalResponsiveSizes;
  readonly scrollable?: boolean;
  readonly showHeader?: boolean;
  readonly showCloseButton?: boolean;
  readonly contentPadding?: ModalContentPadding;
  readonly closeLabel?: string;
  readonly layer?: "default" | "nested";
  /** Inline renders the dialog panel in place without a portal or backdrop. */
  readonly variant?: ModalVariant;
  /** Inline only: centered keeps padding; fill stretches to the parent height. */
  readonly embeddedLayout?: ModalEmbeddedLayout;
  /** Overrides the default sticky-layout max height (e.g. device preview fill). */
  readonly panelMaxHeight?: string;
}

export const MODAL_PANEL_MAX_HEIGHT = "min(90vh, calc(100vh - 2rem))";

export function modalContentIsScrollable(options: {
  readonly scrollable: boolean;
}): boolean {
  return options.scrollable;
}

export function modalPanelViewportStyle(options: {
  readonly useStickyLayout: boolean;
  readonly panelMaxHeight?: string;
  readonly fullscreen?: boolean;
  readonly embedded?: boolean;
}): {
  readonly maxHeight?: string;
  readonly height?: string;
  readonly minHeight?: string;
} {
  if (options.panelMaxHeight === "none") {
    return { minHeight: "100%" };
  }

  if (options.fullscreen) {
    if (options.embedded) {
      return {
        height: "100%",
        minHeight: "100%",
        maxHeight: options.panelMaxHeight ?? "100%",
      };
    }

    return {};
  }

  if (!options.useStickyLayout) {
    return {};
  }

  return {
    maxHeight: options.panelMaxHeight ?? MODAL_PANEL_MAX_HEIGHT,
  };
}

export const MODAL_PANEL_SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
  "2xl": "max-w-[96rem]",
};

export const MODAL_RESPONSIVE_BREAKPOINT_ORDER: readonly ModalResponsiveBreakpoint[] =
  ["base", "sm", "md", "lg", "xl"];

export function isModalFullscreenAtBase(
  sizes: ModalResponsiveSizes | undefined,
  size: ModalSize,
): boolean {
  return (sizes?.base ?? size) === "2xl";
}

const MODAL_FULLSCREEN_BASE_PANEL_CLASSES =
  "h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 shadow-none";

const MODAL_FULLSCREEN_RESET_FROM_SM_PANEL_CLASSES =
  "sm:min-h-0 sm:h-auto sm:max-h-[min(90vh,calc(100vh-2rem))] sm:rounded-xl sm:border sm:border-border sm:shadow-xl";

export const MODAL_OVERLAY_CONTENT_FULLSCREEN_CLASSES =
  "flex h-full min-h-[100dvh] flex-col p-0 sm:min-h-0 sm:items-center sm:justify-center sm:p-4";

export function buildModalResponsiveSizeClassName(
  sizes: ModalResponsiveSizes,
): string {
  const classes: string[] = [];
  let previous: ModalSize | undefined;

  for (const breakpoint of MODAL_RESPONSIVE_BREAKPOINT_ORDER) {
    const value = sizes[breakpoint];
    if (value === previous) {
      continue;
    }
    const prefix = breakpoint === "base" ? "" : `${breakpoint}:`;
    classes.push(`${prefix}${MODAL_PANEL_SIZE_CLASSES[value]}`);
    previous = value;
  }

  return classes.join(" ");
}

export function buildUniformModalResponsiveSizes(
  size: ModalSize,
): ModalResponsiveSizes {
  return {
    base: size,
    sm: size,
    md: size,
    lg: size,
    xl: size,
  };
}

export function buildModalResponsivePanelClassName(
  sizes: ModalResponsiveSizes,
): string {
  if (sizes.base !== "2xl") {
    return buildModalResponsiveSizeClassName(sizes);
  }

  const classes = ["min-h-[100dvh] " + MODAL_FULLSCREEN_BASE_PANEL_CLASSES];
  classes.push(`sm:${MODAL_PANEL_SIZE_CLASSES[sizes.sm]}`);
  classes.push(MODAL_FULLSCREEN_RESET_FROM_SM_PANEL_CLASSES);

  let previous: ModalSize = sizes.sm;

  for (const breakpoint of MODAL_RESPONSIVE_BREAKPOINT_ORDER) {
    if (breakpoint === "base" || breakpoint === "sm") {
      continue;
    }
    const value = sizes[breakpoint];
    if (value === previous) {
      continue;
    }
    classes.push(`${breakpoint}:${MODAL_PANEL_SIZE_CLASSES[value]}`);
    previous = value;
  }

  return classes.join(" ");
}

function resolveEmbeddedFullscreenPanelClassName(): string {
  return "min-h-full h-full max-h-full flex-1 w-full max-w-none rounded-none border-0 shadow-none";
}

function resolveModalPanelSizeClassName(options: {
  readonly size: ModalSize;
  readonly responsiveSizes?: ModalResponsiveSizes;
  readonly embedded?: boolean;
}): string {
  const sizes =
    options.responsiveSizes ?? buildUniformModalResponsiveSizes(options.size);

  if (options.embedded) {
    if (options.size === "2xl" && !options.responsiveSizes) {
      return resolveEmbeddedFullscreenPanelClassName();
    }
    return buildModalResponsiveSizeClassName(sizes);
  }

  return buildModalResponsivePanelClassName(sizes);
}

function resolveModalOverlayContentClassName(options: {
  readonly size: ModalSize;
  readonly responsiveSizes?: ModalResponsiveSizes;
}): string {
  if (isModalFullscreenAtBase(options.responsiveSizes, options.size)) {
    return MODAL_OVERLAY_CONTENT_FULLSCREEN_CLASSES;
  }
  return "flex items-center justify-center p-4";
}

function ModalPanel({
  titleId,
  title,
  children,
  footer,
  panelSizeClassName,
  scrollable,
  showHeader,
  showCloseButton,
  contentPadding,
  closeLabel,
  onClose,
  panelRef,
  embedded = false,
  embeddedFill = false,
  panelMaxHeight,
  suppressEntranceAnimation = false,
  fullscreenAtBase = false,
}: {
  readonly titleId: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly panelSizeClassName: string;
  readonly scrollable: boolean;
  readonly showHeader: boolean;
  readonly showCloseButton: boolean;
  readonly contentPadding: ModalContentPadding;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly embedded?: boolean;
  readonly embeddedFill?: boolean;
  readonly panelMaxHeight?: string;
  readonly suppressEntranceAnimation?: boolean;
  readonly fullscreenAtBase?: boolean;
}) {
  const visible = useOverlayTransitionVisible();
  const durationMs = useOverlayTransitionDurationMs();
  const animate = !embedded && durationMs > 0;
  const hasFooter = Boolean(footer);
  const embeddedFillHeightLocked = embeddedFill && panelMaxHeight !== "none";
  const useStickyLayout = scrollable || hasFooter;
  const contentScrollable = modalContentIsScrollable({ scrollable });
  const flushContent = contentPadding === "none";
  const panelViewportStyle = modalPanelViewportStyle({
    useStickyLayout,
    panelMaxHeight,
    fullscreen: fullscreenAtBase,
    embedded,
  });

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
        panelSizeClassName,
        embedded && !embeddedFill && "mx-auto",
        embeddedFillHeightLocked && "min-h-full h-full max-h-full flex-1",
        embeddedFill && !embeddedFillHeightLocked && "min-h-full w-full flex-1",
        useStickyLayout && !contentScrollable && "overflow-hidden",
        !useStickyLayout && !flushContent && "p-5",
        animate &&
          !suppressEntranceAnimation &&
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
  responsiveSizes,
  scrollable = false,
  showHeader = true,
  showCloseButton = true,
  contentPadding = "default",
  closeLabel = "Close dialog",
  layer = "default",
  variant = "overlay",
  embeddedLayout = "centered",
  panelMaxHeight,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const embedded = variant === "inline";
  const fullscreenAtBase = isModalFullscreenAtBase(responsiveSizes, size);
  const embeddedFill =
    embedded && (embeddedLayout === "fill" || fullscreenAtBase);
  const resolvedPanelMaxHeight =
    embeddedFill && panelMaxHeight === undefined ? "100%" : panelMaxHeight;
  const embeddedFillHeightLocked =
    embeddedFill && resolvedPanelMaxHeight !== "none";

  const focusPanel = useCallback(() => {
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
  }, []);

  const panelSizeClassName = resolveModalPanelSizeClassName({
    size,
    responsiveSizes,
    embedded,
  });
  const overlayContentClassName = resolveModalOverlayContentClassName({
    size,
    responsiveSizes,
  });
  const panel = (
    <ModalPanel
      titleId={titleId}
      title={title}
      footer={footer}
      panelSizeClassName={panelSizeClassName}
      scrollable={scrollable}
      showHeader={showHeader}
      showCloseButton={showCloseButton}
      contentPadding={contentPadding}
      closeLabel={closeLabel}
      onClose={onClose}
      panelRef={panelRef}
      embedded={embedded}
      embeddedFill={embeddedFill}
      panelMaxHeight={resolvedPanelMaxHeight}
      suppressEntranceAnimation={fullscreenAtBase}
      fullscreenAtBase={fullscreenAtBase}
    >
      {children}
    </ModalPanel>
  );

  if (embedded) {
    if (!open) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex min-h-0 w-full",
          embeddedFill || fullscreenAtBase
            ? embeddedFillHeightLocked
              ? "h-full flex-col"
              : "min-h-full flex-col"
            : "flex-1 items-center justify-center p-4",
        )}
      >
        {panel}
      </div>
    );
  }

  return (
    <OverlayRoot
      open={open}
      onClose={onClose}
      closeLabel={closeLabel}
      layer={layer}
      contentClassName={overlayContentClassName}
      focusPanel={focusPanel}
    >
      {panel}
    </OverlayRoot>
  );
}
