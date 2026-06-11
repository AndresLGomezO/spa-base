import { CollapsibleSegmentedSwitcher, FieldLabel, Input } from "@repo/ui";
import {
  RESPONSIVE_BREAKPOINT_ORDER,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";
import type { StyleRule } from "@repo/ui-builder-core";

import {
  buildResponsiveGridStyles,
  inferResponsiveGridEditorMode,
  readResponsiveGridCounts,
  type ResponsiveGridEditorLabels,
  type ResponsiveGridEditorMode,
} from "./responsive-grid-state.js";

export interface ResponsiveGridEditorProps {
  readonly styles?: readonly StyleRule[];
  readonly columnCount: number;
  readonly labels: ResponsiveGridEditorLabels;
  readonly onChange: (styles: readonly StyleRule[]) => void;
  readonly className?: string;
}

const MODE_OPTIONS: readonly {
  readonly value: ResponsiveGridEditorMode;
  readonly labelKey: keyof ResponsiveGridEditorLabels;
}[] = [
  { value: "auto", labelKey: "modeAuto" },
  { value: "custom", labelKey: "modeCustom" },
  { value: "autoFit", labelKey: "modeAutoFit" },
  { value: "fixed", labelKey: "modeFixed" },
];

const BREAKPOINT_SHORT_LABEL_KEYS: Record<
  ResponsiveGridBreakpoint,
  keyof ResponsiveGridEditorLabels
> = {
  base: "breakpointShortBase",
  sm: "breakpointShortSm",
  md: "breakpointShortMd",
  lg: "breakpointShortLg",
  xl: "breakpointShortXl",
};

export function ResponsiveGridEditor({
  styles,
  columnCount,
  labels,
  onChange,
  className,
}: ResponsiveGridEditorProps) {
  const mode = inferResponsiveGridEditorMode(styles);
  const counts = readResponsiveGridCounts(styles, columnCount);
  const autoFitMinWidth =
    styles?.find((rule) => rule.property === "gridAutoFitMinWidth")?.value ??
    "280";

  function updateMode(nextMode: ResponsiveGridEditorMode) {
    onChange(
      buildResponsiveGridStyles({
        currentStyles: styles,
        mode: nextMode,
        columnCount,
        counts,
        autoFitMinWidth: String(autoFitMinWidth),
      }),
    );
  }

  return (
    <div
      className={
        className ??
        "border-primary/30 bg-primary/5 flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
      }
    >
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <FieldLabel className="text-muted-foreground">
          {labels.title}
        </FieldLabel>
        <CollapsibleSegmentedSwitcher
          value={mode}
          segmentWidth="3.5rem"
          ariaLabel={labels.mode}
          options={MODE_OPTIONS.map((option) => ({
            value: option.value,
            label: labels[option.labelKey],
            ariaLabel: String(labels[option.labelKey]),
          }))}
          onChange={updateMode}
        />
      </div>

      {mode === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          {RESPONSIVE_BREAKPOINT_ORDER.map((breakpoint) => (
            <label
              key={breakpoint}
              className="flex w-14 flex-col gap-1 text-sm"
            >
              <span className="text-muted-foreground text-xs">
                {labels[BREAKPOINT_SHORT_LABEL_KEYS[breakpoint]]}
              </span>
              <Input
                type="number"
                min={1}
                max={columnCount}
                value={counts[breakpoint]}
                aria-label={`${labels[BREAKPOINT_SHORT_LABEL_KEYS[breakpoint]]} ${labels.modeCustom}`}
                onChange={(event) => {
                  onChange(
                    buildResponsiveGridStyles({
                      currentStyles: styles,
                      mode: "custom",
                      columnCount,
                      counts: {
                        ...counts,
                        [breakpoint]: event.target.value,
                      },
                    }),
                  );
                }}
              />
            </label>
          ))}
        </div>
      ) : null}

      {mode === "autoFit" ? (
        <label className="flex w-28 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">
            {labels.autoFitMinWidth}
          </span>
          <Input
            type="number"
            min={120}
            value={String(autoFitMinWidth)}
            aria-label={labels.autoFitMinWidth}
            onChange={(event) => {
              onChange(
                buildResponsiveGridStyles({
                  currentStyles: styles,
                  mode: "autoFit",
                  columnCount,
                  autoFitMinWidth: event.target.value,
                }),
              );
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

export type { ResponsiveGridEditorLabels } from "./responsive-grid-state.js";
