import type { ReactNode } from "react";
import { useMemo } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";
import type { ResponsiveGridEditorLabels } from "@repo/ui-builder-react";
import { PreviewBreakpointProvider } from "@repo/ui-builder-renderer";
import { CollapsibleSegmentedSwitcher } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { responsiveGridEditorLabels } from "./responsive-grid-editor-labels.js";

export const DEFAULT_LAYOUT_PREVIEW_BREAKPOINT: ResponsiveGridBreakpoint = "lg";

export type LayoutPreviewBreakpoint = ResponsiveGridBreakpoint | "full";

const LAYOUT_PREVIEW_BREAKPOINT_ORDER: readonly LayoutPreviewBreakpoint[] = [
  ...RESPONSIVE_BREAKPOINT_ORDER,
  "full",
];

const BREAKPOINT_LABEL_KEY: Record<
  ResponsiveGridBreakpoint,
  keyof ResponsiveGridEditorLabels
> = {
  base: "breakpointBase",
  sm: "breakpointSm",
  md: "breakpointMd",
  lg: "breakpointLg",
  xl: "breakpointXl",
};

type PreviewBreakpointShortLabelKey =
  | "formDesigner.previewBreakpoints.base"
  | "formDesigner.previewBreakpoints.sm"
  | "formDesigner.previewBreakpoints.md"
  | "formDesigner.previewBreakpoints.lg"
  | "formDesigner.previewBreakpoints.xl"
  | "formDesigner.previewBreakpoints.full";

const BREAKPOINT_SHORT_LABEL_KEY: Record<
  LayoutPreviewBreakpoint,
  PreviewBreakpointShortLabelKey
> = {
  base: "formDesigner.previewBreakpoints.base",
  sm: "formDesigner.previewBreakpoints.sm",
  md: "formDesigner.previewBreakpoints.md",
  lg: "formDesigner.previewBreakpoints.lg",
  xl: "formDesigner.previewBreakpoints.xl",
  full: "formDesigner.previewBreakpoints.full",
};

function resolveLayoutPreviewRenderBreakpoint(
  breakpoint: LayoutPreviewBreakpoint,
): ResponsiveGridBreakpoint {
  return breakpoint === "full" ? "xl" : breakpoint;
}

function resolvePreviewBreakpointLabel(
  breakpoint: LayoutPreviewBreakpoint,
  labels: ResponsiveGridEditorLabels,
  t: TFunction<"common">,
): string {
  if (breakpoint === "full") {
    return t("formDesigner.previewBreakpoints.fullDescription");
  }

  return labels[BREAKPOINT_LABEL_KEY[breakpoint]];
}

interface LayoutPreviewBreakpointSwitcherProps {
  readonly breakpoint: LayoutPreviewBreakpoint;
  readonly onBreakpointChange: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly className?: string;
}

interface LayoutPreviewFrameSize {
  readonly width: number;
  readonly height: number;
}

const PREVIEW_FRAME_MAX_HEIGHT = "40rem";

function resolvePreviewFrameHeight(height: number): string {
  return `min(${height}px, ${PREVIEW_FRAME_MAX_HEIGHT})`;
}

export function LayoutPreviewBreakpointSwitcher({
  breakpoint,
  onBreakpointChange,
  className,
}: LayoutPreviewBreakpointSwitcherProps) {
  const { t } = useTranslation("common");
  const labels = useMemo(() => responsiveGridEditorLabels(t), [t]);
  const switcherOptions = useMemo(
    () =>
      LAYOUT_PREVIEW_BREAKPOINT_ORDER.map((entry) => ({
        value: entry,
        label: t(BREAKPOINT_SHORT_LABEL_KEY[entry]),
        ariaLabel: resolvePreviewBreakpointLabel(entry, labels, t),
      })),
    [labels, t],
  );
  const screenSizeLabel = t("formDesigner.previewScreenSize");

  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-muted-foreground">{screenSizeLabel}</span>
      <CollapsibleSegmentedSwitcher
        value={breakpoint}
        ariaLabel={screenSizeLabel}
        segmentWidth="2.75rem"
        options={switcherOptions}
        onChange={onBreakpointChange}
      />
    </div>
  );
}

interface LayoutPreviewViewportProps {
  readonly breakpoint: LayoutPreviewBreakpoint;
  readonly children: ReactNode;
  readonly className?: string;
  readonly showFrame?: boolean;
  readonly frameSize?: LayoutPreviewFrameSize;
  /** Stretch the framed preview to the parent height; defers Y scroll to ancestors. */
  readonly fillHeight?: boolean;
}

export function LayoutPreviewViewport({
  breakpoint,
  children,
  className,
  showFrame = true,
  frameSize,
  fillHeight = false,
}: LayoutPreviewViewportProps) {
  const isFullWidth = breakpoint === "full";
  const renderBreakpoint = resolveLayoutPreviewRenderBreakpoint(breakpoint);

  if (!showFrame) {
    return (
      <PreviewBreakpointProvider breakpoint={renderBreakpoint}>
        <div className={cn("h-full min-h-0 w-full", className)}>{children}</div>
      </PreviewBreakpointProvider>
    );
  }

  const framedWidth =
    frameSize?.width ??
    (isFullWidth
      ? undefined
      : RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS[breakpoint]);
  const framedHeight = frameSize
    ? resolvePreviewFrameHeight(frameSize.height)
    : undefined;

  return (
    <PreviewBreakpointProvider breakpoint={renderBreakpoint}>
      <div
        className={cn(
          "max-w-full overflow-x-auto",
          fillHeight ? "flex min-h-full flex-1 flex-col" : "h-full min-h-0",
          className,
        )}
      >
        <div
          className={cn(
            "border-border bg-background box-border flex flex-col border border-dashed",
            isFullWidth
              ? fillHeight
                ? "min-h-full w-full flex-1"
                : "h-full min-h-0 w-full"
              : fillHeight
                ? "mx-auto min-h-full"
                : "mx-auto min-h-full",
            frameSize ? "overflow-hidden rounded-[2rem] shadow-sm" : undefined,
          )}
          style={
            isFullWidth
              ? undefined
              : {
                  width: framedWidth,
                  ...(framedHeight ? { height: framedHeight } : {}),
                }
          }
        >
          {frameSize ? (
            <div className="flex h-full min-h-0 flex-1 flex-col">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </PreviewBreakpointProvider>
  );
}
