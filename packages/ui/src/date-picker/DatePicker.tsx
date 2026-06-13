import { Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button.js";
import { usePreferNativePickers } from "../hooks/usePreferNativePickers.js";
import { Input } from "../input/Input.js";
import { Popover } from "../popover/Popover.js";
import { DatePickerCalendar } from "./DatePickerCalendar.js";
import { DatePickerTime } from "./DatePickerTime.js";
import type {
  CalendarDateParts,
  CalendarView,
  DatePickerLabels,
  DatePickerMode,
} from "./date-picker.types.js";
import {
  buildIsoForMode,
  formatPickerDisplayValue,
  isoToNativeInputValue,
  nativeInputValueToIso,
  resolvePickerParts,
} from "./date-picker.utils.js";

export interface DatePickerProps {
  readonly mode: DatePickerMode;
  readonly value?: string | null;
  readonly onChange: (value: string | undefined) => void;
  readonly disabled?: boolean;
  readonly hasError?: boolean;
  readonly id?: string;
  readonly placeholder?: string;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly labels: DatePickerLabels;
  readonly className?: string;
}

function DatePickerNative({
  mode,
  value,
  onChange,
  disabled = false,
  hasError = false,
  id,
  placeholder,
  labels,
  className,
}: DatePickerProps) {
  const nativeType = mode === "datetime" ? "datetime-local" : mode;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Input
        id={id}
        type={nativeType}
        disabled={disabled}
        hasError={hasError}
        value={isoToNativeInputValue(mode, value)}
        placeholder={placeholder ?? labels.placeholder ?? "Select date"}
        onChange={(event) => {
          onChange(nativeInputValueToIso(mode, event.target.value));
        }}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 self-start px-2"
          disabled={disabled}
          onClick={() => onChange(undefined)}
        >
          {labels.clear ?? "Clear"}
        </Button>
      ) : null}
    </div>
  );
}

function DatePickerPopover({
  mode,
  value,
  onChange,
  disabled = false,
  hasError = false,
  id,
  placeholder,
  locale = "en",
  timeZone = "UTC",
  labels,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("day");
  const initialParts = useMemo(
    () => resolvePickerParts(mode, value),
    [mode, value],
  );
  const [focus, setFocus] = useState<CalendarDateParts>(initialParts);
  const [draft, setDraft] = useState(initialParts);

  useEffect(() => {
    const next = resolvePickerParts(mode, value);
    setFocus(next);
    setDraft(next);
  }, [mode, value]);

  useEffect(() => {
    if (!open) {
      setView("day");
    }
  }, [open]);

  const displayValue = formatPickerDisplayValue(mode, value, locale, timeZone);
  const selectedDate: CalendarDateParts | null = value
    ? {
        year: draft.year,
        month: draft.month,
        day: draft.day,
      }
    : null;

  const showTimeBesideCalendar = mode === "datetime" && view === "day";
  const showStandaloneTime = mode === "time";

  function commit(next: typeof draft, close: boolean) {
    onChange(buildIsoForMode(mode, next));
    if (close) {
      setOpen(false);
    }
  }

  function handleSelectDay(parts: CalendarDateParts) {
    const next = { ...draft, ...parts };
    setDraft(next);
    setFocus(next);

    if (mode === "date") {
      commit(next, true);
      return;
    }

    if (mode === "datetime") {
      setView("day");
    }
  }

  function handleMinuteChange(minute: number) {
    const next = { ...draft, minute };
    setDraft(next);
    if (mode === "time" || mode === "datetime") {
      commit(next, true);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) {
      setOpen(nextOpen);
    }
  }

  const timePicker = (
    <DatePickerTime
      hour={draft.hour}
      minute={draft.minute}
      labels={labels}
      locale={locale}
      onHourChange={(hour) => setDraft((current) => ({ ...current, hour }))}
      onMinuteChange={handleMinuteChange}
      className={showStandaloneTime ? "mx-auto w-36" : undefined}
    />
  );

  const panel = (
    <div className="flex flex-col gap-1.5">
      {mode !== "time" ? (
        <div className="flex items-stretch gap-2">
          <DatePickerCalendar
            view={view}
            focus={focus}
            selected={selectedDate}
            locale={locale}
            labels={labels}
            onViewChange={setView}
            onFocusChange={setFocus}
            onSelectDay={handleSelectDay}
          />
          {showTimeBesideCalendar ? (
            <>
              <div className="border-border w-px shrink-0 self-stretch border-l" />
              {timePicker}
            </>
          ) : null}
        </div>
      ) : (
        timePicker
      )}

      {value ? (
        <div className="border-border shrink-0 border-t pt-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            {labels.clear ?? "Clear"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      fullWidth
      layer="elevated"
      placement="bottom-start"
      className={className}
      panelClassName="w-auto p-2 [&>div]:gap-1.5"
      trigger={
        <div className="relative w-full">
          <Input
            id={id}
            readOnly
            disabled={disabled}
            hasError={hasError}
            value={displayValue}
            placeholder={placeholder ?? labels.placeholder ?? "Select date"}
            className={cn(
              "cursor-pointer pr-10",
              disabled && "cursor-not-allowed",
            )}
          />
          <Calendar
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
          />
        </div>
      }
    >
      {panel}
    </Popover>
  );
}

export function DatePicker(props: DatePickerProps) {
  const preferNative = usePreferNativePickers();

  if (preferNative) {
    return <DatePickerNative {...props} />;
  }

  return <DatePickerPopover {...props} />;
}
