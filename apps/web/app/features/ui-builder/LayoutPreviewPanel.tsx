import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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

export type LayoutPreviewBreakpoint = ResponsiveGridBreakpoint | "full";

export const LAYOUT_PREVIEW_BREAKPOINT_ORDER: readonly LayoutPreviewBreakpoint[] =
  [...RESPONSIVE_BREAKPOINT_ORDER, "full"];

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

const BREAKPOINT_SHORT_LABEL_KEY: Record<LayoutPreviewBreakpoint, string> = {
  base: "formDesigner.previewBreakpoints.base",
  sm: "formDesigner.previewBreakpoints.sm",
  md: "formDesigner.previewBreakpoints.md",
  lg: "formDesigner.previewBreakpoints.lg",
  xl: "formDesigner.previewBreakpoints.xl",
  full: "formDesigner.previewBreakpoints.full",
};

const PREVIEW_SWITCHER_TRACK_CLASS =
  "bg-muted/90 ring-border/40 relative inline-flex w-fit max-w-full rounded-lg p-1 ring-1 ring-inset";

const PREVIEW_SWITCHER_SEGMENT_CLASS =
  "relative z-10 box-border flex min-h-8 w-11 shrink-0 items-center justify-center gap-1 rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

function resolvePreviewRenderBreakpoint(
  breakpoint: LayoutPreviewBreakpoint,
): ResponsiveGridBreakpoint {
  return breakpoint === "full" ? "xl" : breakpoint;
}

function resolvePreviewBreakpointLabel(
  breakpoint: LayoutPreviewBreakpoint,
  labels: ResponsiveGridEditorLabels,
  t: (key: string) => string,
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
  const shortLabels = useMemo(
    () =>
      Object.fromEntries(
        LAYOUT_PREVIEW_BREAKPOINT_ORDER.map((entry) => [
          entry,
          t(BREAKPOINT_SHORT_LABEL_KEY[entry]),
        ]),
      ) as Record<LayoutPreviewBreakpoint, string>,
    [t],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const screenSizeLabel = t("formDesigner.previewScreenSize");
  const activeIndex = LAYOUT_PREVIEW_BREAKPOINT_ORDER.indexOf(breakpoint);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const segmentSize = "2.75rem";
  const thumbLeft = `calc(0.25rem + ${safeIndex} * (2.75rem + 0.25rem))`;

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleSelect = useCallback(
    (entry: LayoutPreviewBreakpoint) => {
      onBreakpointChange(entry);
      collapse();
    },
    [collapse, onBreakpointChange],
  );

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        collapse();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [collapse, expanded]);

  const activeShortLabel = shortLabels[breakpoint];
  const activeLabel = resolvePreviewBreakpointLabel(breakpoint, labels, t);

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-muted-foreground">{screenSizeLabel}</span>
      <div
        role="radiogroup"
        aria-label={screenSizeLabel}
        className={cn(
          PREVIEW_SWITCHER_TRACK_CLASS,
          expanded ? "gap-1" : "gap-0",
        )}
      >
        {expanded ? (
          <>
            <span
              aria-hidden
              className="bg-background pointer-events-none absolute top-1 bottom-1 rounded-md shadow-sm transition-[left] duration-200 ease-out"
              style={{
                width: segmentSize,
                left: thumbLeft,
              }}
            />
            {LAYOUT_PREVIEW_BREAKPOINT_ORDER.map((entry) => {
              const isActive = entry === breakpoint;
              const label = resolvePreviewBreakpointLabel(entry, labels, t);
              const shortLabel = shortLabels[entry];

              return (
                <button
                  key={entry}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={label}
                  onClick={() => handleSelect(entry)}
                  className={cn(
                    PREVIEW_SWITCHER_SEGMENT_CLASS,
                    isActive
                      ? "text-foreground"
                      : "text-text-tertiary hover:text-foreground",
                  )}
                >
                  {shortLabel}
                </button>
              );
            })}
          </>
        ) : (
          <button
            type="button"
            role="radio"
            aria-checked
            aria-label={activeLabel}
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            className={cn(
              PREVIEW_SWITCHER_SEGMENT_CLASS,
              "bg-background text-foreground w-auto min-w-11 px-2.5 shadow-sm",
            )}
          >
            {activeShortLabel}
            <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-70" />
          </button>
        )}
      </div>
    </div>
  );
}

interface LayoutPreviewViewportProps {
  readonly breakpoint: LayoutPreviewBreakpoint;
  readonly children: ReactNode;
  readonly className?: string;
}

export function LayoutPreviewViewport({
  breakpoint,
  children,
  className,
}: LayoutPreviewViewportProps) {
  const isFullWidth = breakpoint === "full";
  const renderBreakpoint = resolvePreviewRenderBreakpoint(breakpoint);

  return (
    <PreviewBreakpointProvider breakpoint={renderBreakpoint}>
      <div className={cn("max-w-full overflow-x-auto", className, "min-h-full")}>
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
