import { Input, SegmentedSwitch, Text } from "@repo/ui";
import type { StyleRule } from "@repo/ui-builder-core";

import {
  applyStackOnMobilePreset,
  buildResponsiveGridStyles,
  inferResponsiveGridEditorMode,
  readResponsiveGridCounts,
  type ResponsiveGridEditorLabels,
  type ResponsiveGridEditorMode,
  BREAKPOINT_LABEL_KEYS,
  GRID_COLUMNS_PROPERTY_BY_BREAKPOINT,
} from "./responsive-grid-state.js";

export interface ResponsiveGridEditorProps {
  readonly styles?: readonly StyleRule[];
  readonly columnCount: number;
  readonly labels: ResponsiveGridEditorLabels;
  readonly onChange: (styles: readonly StyleRule[]) => void;
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

export function ResponsiveGridEditor({
  styles,
  columnCount,
  labels,
  onChange,
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
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <Text className="text-sm font-medium">{labels.title}</Text>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.mode}</span>
        <SegmentedSwitch
          value={mode}
          options={MODE_OPTIONS.map((option) => ({
            value: option.value,
            label: labels[option.labelKey],
            ariaLabel: labels[option.labelKey],
          }))}
          onChange={updateMode}
          ariaLabel={labels.mode}
        />
      </label>

      {mode === "custom" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(
            Object.keys(GRID_COLUMNS_PROPERTY_BY_BREAKPOINT) as Array<
              keyof typeof GRID_COLUMNS_PROPERTY_BY_BREAKPOINT
            >
          ).map((breakpoint) => (
            <label key={breakpoint} className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels[BREAKPOINT_LABEL_KEYS[breakpoint]]}
              </span>
              <Input
                type="number"
                min={1}
                max={columnCount}
                value={counts[breakpoint]}
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.autoFitMinWidth}
          </span>
          <Input
            type="number"
            min={120}
            value={String(autoFitMinWidth)}
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

      {columnCount >= 2 && mode !== "fixed" ? (
        <button
          type="button"
          className="text-primary text-left text-sm underline-offset-2 hover:underline"
          onClick={() =>
            onChange(applyStackOnMobilePreset(styles, columnCount))
          }
        >
          {labels.stackOnMobilePreset}
        </button>
      ) : null}
    </div>
  );
}

export type { ResponsiveGridEditorLabels } from "./responsive-grid-state.js";
