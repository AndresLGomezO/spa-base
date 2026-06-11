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
import { CollapsibleSegmentedSwitcher, Text } from "@repo/ui";
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

const PREVIEW_SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring rounded-md border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

interface LayoutPreviewBreakpointSelectProps {
  readonly breakpoint: ResponsiveGridBreakpoint;
  readonly onBreakpointChange: (breakpoint: ResponsiveGridBreakpoint) => void;
  readonly className?: string;
}

export function LayoutPreviewBreakpointSelect({
  breakpoint,
  onBreakpointChange,
  className,
}: LayoutPreviewBreakpointSelectProps) {
  const { t } = useTranslation("common");
  const labels = useMemo(() => responsiveGridEditorLabels(t), [t]);

  return (
    <label className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-muted-foreground">
        {t("designLayout.previewScreenSize")}
      </span>
      <select
        className={PREVIEW_SELECT_CLASS}
        value={breakpoint}
        aria-label={t("designLayout.previewScreenSize")}
        onChange={(event) =>
          onBreakpointChange(event.target.value as ResponsiveGridBreakpoint)
        }
      >
        {RESPONSIVE_BREAKPOINT_ORDER.map((entry) => (
          <option key={entry} value={entry}>
            {labels[BREAKPOINT_LABEL_KEY[entry]]}
          </option>
        ))}
      </select>
    </label>
  );
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
}

export function LayoutPreviewViewport({
  breakpoint,
  children,
  className,
  showFrame = true,
}: LayoutPreviewViewportProps) {
  const isFullWidth = breakpoint === "full";
  const renderBreakpoint = resolveLayoutPreviewRenderBreakpoint(breakpoint);

  if (!showFrame) {
    return (
      <PreviewBreakpointProvider breakpoint={renderBreakpoint}>
        <div className={cn("w-full", className)}>{children}</div>
      </PreviewBreakpointProvider>
    );
  }

  return (
    <PreviewBreakpointProvider breakpoint={renderBreakpoint}>
      <div
        className={cn("max-w-full overflow-x-auto", className, "min-h-full")}
      >
        <div
          className={cn(
            "border-border bg-background box-border flex min-h-full flex-col border border-dashed",
            isFullWidth ? "w-full" : "mx-auto",
          )}
          style={
            isFullWidth
              ? undefined
              : { width: RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS[breakpoint] }
          }
        >
          {children}
        </div>
      </div>
    </PreviewBreakpointProvider>
  );
}

interface LayoutPreviewPanelProps {
  readonly title: string;
  readonly breakpoint: ResponsiveGridBreakpoint;
  readonly onBreakpointChange: (breakpoint: ResponsiveGridBreakpoint) => void;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function LayoutPreviewPanel({
  title,
  breakpoint,
  onBreakpointChange,
  children,
  actions,
  className,
}: LayoutPreviewPanelProps) {
  return (
    <div
      className={cn(
        "bg-card border-border flex flex-col gap-3 rounded-lg border p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Text className="text-muted-foreground text-sm">{title}</Text>
        <div className="flex flex-wrap items-end gap-3">
          <LayoutPreviewBreakpointSelect
            breakpoint={breakpoint}
            onBreakpointChange={onBreakpointChange}
          />
          {actions}
        </div>
      </div>
      <LayoutPreviewViewport breakpoint={breakpoint}>
        {children}
      </LayoutPreviewViewport>
    </div>
  );
}
