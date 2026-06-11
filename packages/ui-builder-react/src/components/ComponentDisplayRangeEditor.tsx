import {
  Button,
  CollapsibleSegmentedSwitcher,
  FieldLabel,
  Text,
} from "@repo/ui";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";

import {
  BREAKPOINT_SHORT_LABEL_KEYS,
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
  readonly variant?: "card" | "inline";
  readonly className?: string;
}

function breakpointSwitcherOptions(
  labels: ComponentDisplayRangeEditorLabels,
): ReadonlyArray<{
  readonly value: ResponsiveGridBreakpoint;
  readonly label: string;
  readonly ariaLabel: string;
}> {
  return DISPLAY_RANGE_BREAKPOINTS.map((breakpoint) => ({
    value: breakpoint,
    label: labels[BREAKPOINT_SHORT_LABEL_KEYS[breakpoint]],
    ariaLabel: labels[BREAKPOINT_SHORT_LABEL_KEYS[breakpoint]],
  }));
}

function DisplayRangeSwitchers({
  range,
  labels,
  onFromChange,
  onToChange,
}: {
  readonly range: ReturnType<typeof readDisplayRange>;
  readonly labels: ComponentDisplayRangeEditorLabels;
  readonly onFromChange: (value: ResponsiveGridBreakpoint) => void;
  readonly onToChange: (value: ResponsiveGridBreakpoint) => void;
}) {
  const options = breakpointSwitcherOptions(labels);

  return (
    <>
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <FieldLabel className="text-muted-foreground">{labels.from}</FieldLabel>
        <CollapsibleSegmentedSwitcher
          value={range.from}
          segmentWidth="2.75rem"
          ariaLabel={labels.from}
          options={options}
          onChange={onFromChange}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <FieldLabel className="text-muted-foreground">{labels.to}</FieldLabel>
        <CollapsibleSegmentedSwitcher
          value={range.to}
          segmentWidth="2.75rem"
          ariaLabel={labels.to}
          options={options}
          onChange={onToChange}
        />
      </div>
    </>
  );
}

export function ComponentDisplayRangeEditor({
  displayFrom,
  displayTo,
  labels,
  onChange,
  variant = "card",
  className,
}: ComponentDisplayRangeEditorProps) {
  const range = readDisplayRange(displayFrom, displayTo);

  function updateRange(
    nextFrom: ResponsiveGridBreakpoint,
    nextTo: ResponsiveGridBreakpoint,
  ) {
    onChange(buildDisplayRangePatch(nextFrom, nextTo));
  }

  const switchers = (
    <DisplayRangeSwitchers
      range={range}
      labels={labels}
      onFromChange={(value) => updateRange(value, range.to)}
      onToChange={(value) => updateRange(range.from, value)}
    />
  );

  if (variant === "inline") {
    return (
      <div className={className ?? "flex flex-wrap items-end gap-3"}>
        {switchers}
      </div>
    );
  }

  return (
    <div className={className ?? "flex flex-col gap-3 rounded-md border p-3"}>
      <Text className="text-sm font-medium">{labels.title}</Text>

      <div className="flex flex-wrap items-end gap-3">{switchers}</div>

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
