import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  TimeRangeSelector,
  resolveTimeRangeBounds,
  type TimeRangeDurationId,
  type TimeRangePresetId,
  type TimeRangeSelection,
  type TimeRangeSelectorLabels,
} from "@repo/ui";

import { getBrowserTimeZone } from "../debugger-time-range-url";
import { useDebuggerTimeRange } from "../use-debugger-time-range";

function useDebuggerTimeRangeLabels(timeZone: string): TimeRangeSelectorLabels {
  const { t, i18n } = useTranslation("common");

  return useMemo((): TimeRangeSelectorLabels => {
    const formatDateTime = (iso: string) => {
      const ms = Date.parse(iso);
      if (!Number.isFinite(ms)) {
        return iso;
      }
      return new Intl.DateTimeFormat(i18n.language, {
        timeZone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(ms));
    };

    return {
      triggerAriaLabel: t("debugger.timeRange.triggerAriaLabel"),
      presetsHeading: t("debugger.timeRange.presets"),
      customHeading: t("debugger.timeRange.custom"),
      aroundHeading: t("debugger.timeRange.around"),
      startLabel: t("debugger.timeRange.start"),
      endLabel: t("debugger.timeRange.end"),
      aroundAtLabel: t("debugger.timeRange.aroundAt"),
      aroundWindowLabel: t("debugger.timeRange.aroundWindow"),
      timezoneLabel: t("debugger.timeRange.timezone"),
      apply: t("debugger.timeRange.apply"),
      cancel: t("debugger.timeRange.cancel"),
      presetLabel: (preset: TimeRangePresetId) =>
        t(`debugger.timeRange.preset.${preset}`),
      durationLabel: (duration: TimeRangeDurationId) =>
        t(`debugger.timeRange.duration.${duration}`),
      customSummary: (fromIso, toIso) =>
        t("debugger.timeRange.customSummary", {
          from: formatDateTime(fromIso),
          to: formatDateTime(toIso),
        }),
      aroundSummary: (atIso, window) =>
        t("debugger.timeRange.aroundSummary", {
          at: formatDateTime(atIso),
          window: t(`debugger.timeRange.duration.${window}`),
        }),
      datePicker: {
        placeholder: t("debugger.timeRange.datePicker.placeholder"),
        clear: t("debugger.timeRange.datePicker.clear"),
        previous: t("debugger.timeRange.datePicker.previous"),
        next: t("debugger.timeRange.datePicker.next"),
        selectYear: t("debugger.timeRange.datePicker.selectYear"),
        selectMonth: t("debugger.timeRange.datePicker.selectMonth"),
        am: t("debugger.timeRange.datePicker.am"),
        pm: t("debugger.timeRange.datePicker.pm"),
        hour: t("debugger.timeRange.datePicker.hour"),
        minute: t("debugger.timeRange.datePicker.minute"),
        selectTime: t("debugger.timeRange.datePicker.selectTime"),
        openCalendar: t("debugger.timeRange.datePicker.openCalendar"),
      },
    };
  }, [i18n.language, t, timeZone]);
}

interface DebuggerTimeRangeControlProps {
  readonly className?: string;
  readonly selection?: TimeRangeSelection;
  readonly onSelectionChange?: (selection: TimeRangeSelection) => void;
  readonly timeZone?: string;
  readonly onTimeZoneChange?: (timeZone: string) => void;
}

function UrlDebuggerTimeRangeControl({
  className,
}: {
  readonly className?: string;
}) {
  const { selection, setSelection, timeZone, setTimeZone } =
    useDebuggerTimeRange();
  const labels = useDebuggerTimeRangeLabels(timeZone);

  return (
    <TimeRangeSelector
      className={className}
      value={selection}
      onChange={setSelection}
      timeZone={timeZone}
      onTimeZoneChange={setTimeZone}
      labels={labels}
      compact
    />
  );
}

function ControlledDebuggerTimeRangeControl({
  className,
  selection,
  onSelectionChange,
  timeZone,
  onTimeZoneChange,
}: {
  readonly className?: string;
  readonly selection: TimeRangeSelection;
  readonly onSelectionChange: (selection: TimeRangeSelection) => void;
  readonly timeZone: string;
  readonly onTimeZoneChange: (timeZone: string) => void;
}) {
  const labels = useDebuggerTimeRangeLabels(timeZone);

  return (
    <TimeRangeSelector
      className={className}
      value={selection}
      onChange={onSelectionChange}
      timeZone={timeZone}
      onTimeZoneChange={onTimeZoneChange}
      labels={labels}
      compact
    />
  );
}

export function DebuggerTimeRangeControl({
  className,
  selection,
  onSelectionChange,
  timeZone,
  onTimeZoneChange,
}: DebuggerTimeRangeControlProps) {
  if (selection != null && onSelectionChange != null) {
    return (
      <ControlledDebuggerTimeRangeControl
        className={className}
        selection={selection}
        onSelectionChange={onSelectionChange}
        timeZone={timeZone ?? getBrowserTimeZone()}
        onTimeZoneChange={onTimeZoneChange ?? (() => undefined)}
      />
    );
  }

  return <UrlDebuggerTimeRangeControl className={className} />;
}

/** Local (non-URL) time range state for panels outside the debugger route. */
export function useLocalDebuggerTimeRange(
  initialSelection: TimeRangeSelection = { mode: "preset", preset: "1d" },
) {
  const [selection, setSelection] =
    useState<TimeRangeSelection>(initialSelection);
  const [timeZone, setTimeZone] = useState(() => getBrowserTimeZone());

  const resolveBounds = useCallback(
    (now: Date = new Date()) =>
      resolveTimeRangeBounds(selection, now, timeZone),
    [selection, timeZone],
  );

  return {
    selection,
    setSelection,
    timeZone,
    setTimeZone,
    resolveBounds,
  };
}
