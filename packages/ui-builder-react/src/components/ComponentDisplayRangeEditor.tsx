import { Button, Text } from "@repo/ui";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";

import {
  BREAKPOINT_LABEL_KEYS,
  DISPLAY_RANGE_BREAKPOINTS,
  buildDisplayRangePatch,
  clearDisplayRangePatch,
  readDisplayRange,
  type ComponentDisplayRangeEditorLabels,
  type DisplayRangePatch,
} from "./component-display-range-state.js";

export interface ComponentDisplayRangeEditorProps {
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
  readonly labels: ComponentDisplayRangeEditorLabels;
  readonly onChange: (patch: DisplayRangePatch) => void;
}

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

export function ComponentDisplayRangeEditor({
  displayFrom,
  displayTo,
  labels,
  onChange,
}: ComponentDisplayRangeEditorProps) {
  const range = readDisplayRange(displayFrom, displayTo);

  function updateRange(
    nextFrom: ResponsiveGridBreakpoint,
    nextTo: ResponsiveGridBreakpoint,
  ) {
    onChange(buildDisplayRangePatch(nextFrom, nextTo));
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <Text className="text-sm font-medium">{labels.title}</Text>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.from}</span>
          <select
            className={SELECT_CLASS}
            value={range.from}
            onChange={(event) =>
              updateRange(
                event.target.value as ResponsiveGridBreakpoint,
                range.to,
              )
            }
          >
            {DISPLAY_RANGE_BREAKPOINTS.map((breakpoint) => (
              <option key={breakpoint} value={breakpoint}>
                {labels[BREAKPOINT_LABEL_KEYS[breakpoint]]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.to}</span>
          <select
            className={SELECT_CLASS}
            value={range.to}
            onChange={(event) =>
              updateRange(
                range.from,
                event.target.value as ResponsiveGridBreakpoint,
              )
            }
          >
            {DISPLAY_RANGE_BREAKPOINTS.map((breakpoint) => (
              <option key={breakpoint} value={breakpoint}>
                {labels[BREAKPOINT_LABEL_KEYS[breakpoint]]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {range.isAllScreens ? (
        <Text className="text-muted-foreground text-sm">
          {labels.allScreens}
        </Text>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateRange("base", "base")}
        >
          {labels.presetMobileOnly}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateRange("md", "xl")}
        >
          {labels.presetTabletUp}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateRange("lg", "xl")}
        >
          {labels.presetDesktopOnly}
        </Button>
        {!range.isAllScreens ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(clearDisplayRangePatch())}
          >
            {labels.allScreens}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export type { ComponentDisplayRangeEditorLabels } from "./component-display-range-state.js";
