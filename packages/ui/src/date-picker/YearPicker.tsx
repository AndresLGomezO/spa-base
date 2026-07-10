import { Calendar } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { cn } from "@repo/theme/utils";

import { Input } from "../input/Input.js";
import { usePreferNativePickers } from "../hooks/usePreferNativePickers.js";
import { Popover } from "../popover/Popover.js";
import { DatePickerCalendar } from "./DatePickerCalendar.js";
import type {
  CalendarDateParts,
  CalendarView,
  DatePickerLabels,
} from "./date-picker.types.js";
import {
  formatYearBucket,
  formatYearBucketDisplay,
  parseYearBucket,
} from "./date-picker.utils.js";
import {
  DatePickerFieldClearButton,
  datePickerCompactInputPadding,
} from "./DatePickerFieldClearButton.js";

export interface YearPickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly hasError?: boolean;
  readonly id?: string;
  readonly placeholder?: string;
  readonly locale?: string;
  readonly labels: DatePickerLabels;
  readonly className?: string;
  readonly inputClassName?: string;
  readonly inputStyle?: CSSProperties;
  readonly compact?: boolean;
  readonly showClearButton?: boolean;
  readonly onClear?: () => void;
  readonly clearAriaLabel?: string;
}

function YearPickerNative({
  value,
  onChange,
  disabled = false,
  hasError = false,
  id,
  placeholder,
  labels,
  className,
  inputClassName,
  inputStyle,
  compact = false,
  showClearButton = false,
  onClear,
  clearAriaLabel,
}: YearPickerProps) {
  return (
    <Input
      id={id}
      type="number"
      min={1000}
      max={9999}
      step={1}
      disabled={disabled}
      hasError={hasError}
      value={value}
      placeholder={placeholder ?? labels.placeholder ?? "Select year"}
      className={cn(
        compact && "w-auto [field-sizing:content]",
        className,
        inputClassName,
      )}
      style={inputStyle}
      onChange={(event) => {
        const next = event.target.value.trim();
        if (!next || !parseYearBucket(next)) {
          return;
        }
        onChange(next);
      }}
    />
  );
}

function YearPickerPopover({
  value,
  onChange,
  disabled = false,
  hasError = false,
  id,
  placeholder,
  locale = "en",
  labels,
  className,
  inputClassName,
  inputStyle,
  compact = false,
  showClearButton = false,
  onClear,
  clearAriaLabel,
}: YearPickerProps) {
  const canClear = showClearButton && onClear !== undefined;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("year");
  const initialParts = useMemo(() => {
    const parsed = parseYearBucket(value);
    if (parsed) {
      return { ...parsed, month: 0, day: 1 };
    }

    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: 1,
    };
  }, [value]);
  const [focus, setFocus] = useState<CalendarDateParts>(initialParts);

  useEffect(() => {
    const parsed = parseYearBucket(value);
    if (parsed) {
      setFocus((current) => ({ ...current, year: parsed.year }));
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      setView("year");
    }
  }, [open]);

  const displayValue = formatYearBucketDisplay(value, locale);
  const selectedParts = parseYearBucket(value);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) {
      setOpen(nextOpen);
    }
  }

  function handleSelectYear(parts: Pick<CalendarDateParts, "year">) {
    onChange(formatYearBucket(parts.year));
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      layer="elevated"
      placement="bottom-start"
      className={cn(compact && "w-fit", className)}
      panelClassName="w-auto p-2 [&>div]:gap-1.5"
      trigger={
        <div
          className={cn("relative", compact ? "inline-block w-fit" : "w-full")}
        >
          <Input
            id={id}
            readOnly
            disabled={disabled}
            hasError={hasError}
            value={displayValue}
            placeholder={placeholder ?? labels.placeholder ?? "Select year"}
            className={cn(
              "cursor-pointer",
              datePickerCompactInputPadding(compact, canClear) ?? "pr-10",
              compact && "w-auto [field-sizing:content] min-w-[3rem]",
              disabled && "cursor-not-allowed",
              inputClassName,
            )}
            style={inputStyle}
          />
          <DatePickerFieldClearButton
            visible={canClear}
            ariaLabel={clearAriaLabel ?? labels.clear ?? "Clear"}
            onClear={onClear ?? (() => undefined)}
          />
          <Calendar
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
          />
        </div>
      }
    >
      <DatePickerCalendar
        view={view}
        focus={focus}
        selected={selectedParts ? { ...selectedParts, month: 0, day: 1 } : null}
        locale={locale}
        labels={labels}
        selectionMode="year"
        onViewChange={setView}
        onFocusChange={setFocus}
        onSelectDay={() => undefined}
        onSelectYear={handleSelectYear}
      />
    </Popover>
  );
}

export function YearPicker(props: YearPickerProps) {
  const preferNative = usePreferNativePickers();

  if (preferNative) {
    return <YearPickerNative {...props} />;
  }

  return <YearPickerPopover {...props} />;
}
