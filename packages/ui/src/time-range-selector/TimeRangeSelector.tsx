import { Clock, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button.js";
import { DatePicker } from "../date-picker/DatePicker.js";
import type { DatePickerLabels } from "../date-picker/date-picker.types.js";
import { Popover } from "../popover/Popover.js";
import { Select } from "../select/Select.js";
import {
  TIME_RANGE_DURATION_IDS,
  TIME_RANGE_PRESET_IDS,
  type TimeRangeDurationId,
  type TimeRangePresetId,
  type TimeRangeSelection,
} from "./time-range-types.js";

export interface TimeRangeSelectorLabels {
  readonly triggerAriaLabel: string;
  readonly presetsHeading: string;
  readonly customHeading: string;
  readonly aroundHeading: string;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly aroundAtLabel: string;
  readonly aroundWindowLabel: string;
  readonly timezoneLabel: string;
  readonly apply: string;
  readonly cancel: string;
  readonly presetLabel: (preset: TimeRangePresetId) => string;
  readonly durationLabel: (duration: TimeRangeDurationId) => string;
  readonly customSummary: (fromIso: string, toIso: string) => string;
  readonly aroundSummary: (
    atIso: string,
    window: TimeRangeDurationId,
  ) => string;
  readonly datePicker: DatePickerLabels;
}

export interface TimeRangeSelectorProps {
  readonly value: TimeRangeSelection;
  readonly onChange: (value: TimeRangeSelection) => void;
  readonly timeZone: string;
  readonly onTimeZoneChange: (timeZone: string) => void;
  readonly timeZones?: readonly string[];
  readonly labels: TimeRangeSelectorLabels;
  readonly className?: string;
  readonly compact?: boolean;
}

type PanelTab = "presets" | "custom" | "around";

function selectionTab(selection: TimeRangeSelection): PanelTab {
  if (selection.mode === "custom") return "custom";
  if (selection.mode === "around") return "around";
  return "presets";
}

function triggerLabel(
  selection: TimeRangeSelection,
  labels: TimeRangeSelectorLabels,
): string {
  switch (selection.mode) {
    case "preset":
      return labels.presetLabel(selection.preset);
    case "custom":
      return labels.customSummary(selection.fromIso, selection.toIso);
    case "around":
      return labels.aroundSummary(selection.atIso, selection.window);
  }
}

function defaultTimeZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported && supported.length > 0) {
      return supported;
    }
  } catch {
    // fall through
  }
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Bogota",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
  ];
}

export function TimeRangeSelector({
  value,
  onChange,
  timeZone,
  onTimeZoneChange,
  timeZones,
  labels,
  className,
  compact = true,
}: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>(() => selectionTab(value));
  const [draftPreset, setDraftPreset] = useState<TimeRangePresetId>(
    value.mode === "preset" ? value.preset : "5m",
  );
  const [draftFrom, setDraftFrom] = useState(
    value.mode === "custom" ? value.fromIso : "",
  );
  const [draftTo, setDraftTo] = useState(
    value.mode === "custom" ? value.toIso : "",
  );
  const [draftAt, setDraftAt] = useState(
    value.mode === "around" ? value.atIso : "",
  );
  const [draftWindow, setDraftWindow] = useState<TimeRangeDurationId>(
    value.mode === "around" ? value.window : "5m",
  );
  const [draftTz, setDraftTz] = useState(timeZone);

  const zones = useMemo(() => timeZones ?? defaultTimeZones(), [timeZones]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTab(selectionTab(value));
    setDraftPreset(value.mode === "preset" ? value.preset : "5m");
    setDraftFrom(value.mode === "custom" ? value.fromIso : "");
    setDraftTo(value.mode === "custom" ? value.toIso : "");
    setDraftAt(value.mode === "around" ? value.atIso : "");
    setDraftWindow(value.mode === "around" ? value.window : "5m");
    setDraftTz(timeZone);
  }, [open, timeZone, value]);

  const apply = () => {
    onTimeZoneChange(draftTz);
    if (tab === "presets") {
      onChange({ mode: "preset", preset: draftPreset });
      setOpen(false);
      return;
    }
    if (tab === "custom") {
      if (!draftFrom || !draftTo) {
        return;
      }
      onChange({ mode: "custom", fromIso: draftFrom, toIso: draftTo });
      setOpen(false);
      return;
    }
    if (!draftAt) {
      return;
    }
    onChange({ mode: "around", atIso: draftAt, window: draftWindow });
    setOpen(false);
  };

  const selectPresetImmediately = (preset: TimeRangePresetId) => {
    setDraftPreset(preset);
    onTimeZoneChange(draftTz);
    onChange({ mode: "preset", preset });
    setOpen(false);
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        fullWidth
        panelClassName="w-[min(22rem,calc(100vw-2rem))] p-0"
        trigger={
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "md"}
            className="w-full justify-between gap-2 font-normal"
            aria-label={labels.triggerAriaLabel}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{triggerLabel(value, labels)}</span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
          </Button>
        }
      >
        <div className="flex flex-col gap-0">
          <div className="border-border flex gap-1 border-b p-2">
            {(
              [
                ["presets", labels.presetsHeading],
                ["custom", labels.customHeading],
                ["around", labels.aroundHeading],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                  tab === id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {tab === "presets" ? (
              <ul className="flex flex-col gap-0.5">
                {TIME_RANGE_PRESET_IDS.map((preset) => (
                  <li key={preset}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-muted w-full rounded-sm px-2 py-1.5 text-left text-sm",
                        value.mode === "preset" &&
                          value.preset === preset &&
                          "bg-muted font-medium",
                      )}
                      onClick={() => selectPresetImmediately(preset)}
                    >
                      {labels.presetLabel(preset)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {tab === "custom" ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {labels.startLabel}
                  </span>
                  <DatePicker
                    mode="datetime"
                    value={draftFrom || null}
                    onChange={(next) => setDraftFrom(next ?? "")}
                    labels={labels.datePicker}
                    timeZone={draftTz}
                    compact
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {labels.endLabel}
                  </span>
                  <DatePicker
                    mode="datetime"
                    value={draftTo || null}
                    onChange={(next) => setDraftTo(next ?? "")}
                    labels={labels.datePicker}
                    timeZone={draftTz}
                    compact
                  />
                </label>
              </div>
            ) : null}

            {tab === "around" ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {labels.aroundAtLabel}
                  </span>
                  <DatePicker
                    mode="datetime"
                    value={draftAt || null}
                    onChange={(next) => setDraftAt(next ?? "")}
                    labels={labels.datePicker}
                    timeZone={draftTz}
                    compact
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {labels.aroundWindowLabel}
                  </span>
                  <Select
                    selectSize="sm"
                    value={draftWindow}
                    onChange={(event) =>
                      setDraftWindow(event.target.value as TimeRangeDurationId)
                    }
                  >
                    {TIME_RANGE_DURATION_IDS.map((duration) => (
                      <option key={duration} value={duration}>
                        {labels.durationLabel(duration)}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="border-border flex flex-col gap-2 border-t p-2">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">
                {labels.timezoneLabel}
              </span>
              <Select
                selectSize="sm"
                searchable
                searchPlaceholder={labels.timezoneLabel}
                value={draftTz}
                onChange={(event) => {
                  const nextTz = event.target.value;
                  setDraftTz(nextTz);
                  onTimeZoneChange(nextTz);
                }}
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </label>

            {tab !== "presets" ? (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  {labels.cancel}
                </Button>
                <Button type="button" size="sm" onClick={apply}>
                  {labels.apply}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Popover>
    </div>
  );
}
