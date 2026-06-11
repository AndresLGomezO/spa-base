import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";
import type { ResponsiveGridEditorLabels } from "@repo/ui-builder-react";
import { PreviewBreakpointProvider } from "@repo/ui-builder-renderer";
import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { responsiveGridEditorLabels } from "./responsive-grid-editor-labels.js";

export const DEFAULT_LAYOUT_PREVIEW_BREAKPOINT: ResponsiveGridBreakpoint = "lg";

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

interface LayoutPreviewViewportProps {
  readonly breakpoint: ResponsiveGridBreakpoint;
  readonly children: ReactNode;
  readonly className?: string;
}

export function LayoutPreviewViewport({
  breakpoint,
  children,
  className,
}: LayoutPreviewViewportProps) {
  return (
    <PreviewBreakpointProvider breakpoint={breakpoint}>
      <div className={cn("max-w-full overflow-x-auto", className)}>
        <div
          className="border-border bg-background mx-auto box-border min-h-0 border border-dashed"
          style={{ width: RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS[breakpoint] }}
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
