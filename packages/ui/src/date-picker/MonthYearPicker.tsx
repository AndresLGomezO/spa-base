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
  formatMonthYearBucket,
  formatMonthYearBucketDisplay,
  parseMonthYearBucket,
} from "./date-picker.utils.js";
import {
  DatePickerFieldClearButton,
  datePickerCompactInputPadding,
} from "./DatePickerFieldClearButton.js";

export interface MonthYearPickerProps {
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

function MonthYearPickerNative({
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
}: MonthYearPickerProps) {
  return (
    <Input
      id={id}
      type="month"
      disabled={disabled}
      hasError={hasError}
      value={value}
      placeholder={placeholder ?? labels.placeholder ?? "Select month"}
      className={cn(
        compact && "w-auto [field-sizing:content]",
        className,
        inputClassName,
      )}
      style={inputStyle}
      onChange={(event) => {
        const next = event.target.value.trim();
        if (!next) {
          return;
        }
        onChange(next);
      }}
    />
  );
}

function MonthYearPickerPopover({
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
}: MonthYearPickerProps) {
  const canClear = showClearButton && onClear !== undefined;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("month");
  const initialParts = useMemo(() => {
    const parsed = parseMonthYearBucket(value);
    if (parsed) {
      return { ...parsed, day: 1 };
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
    const parsed = parseMonthYearBucket(value);
    if (parsed) {
      setFocus({ ...parsed, day: 1 });
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      setView("month");
    }
  }, [open]);

  const displayValue = formatMonthYearBucketDisplay(value, locale);
  const selectedParts = parseMonthYearBucket(value);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) {
      setOpen(nextOpen);
    }
  }

  function handleSelectMonth(parts: Pick<CalendarDateParts, "year" | "month">) {
    onChange(formatMonthYearBucket(parts.year, parts.month));
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
            placeholder={placeholder ?? labels.placeholder ?? "Select month"}
            className={cn(
              "cursor-pointer",
              datePickerCompactInputPadding(compact, canClear) ?? "pr-10",
              compact && "w-auto [field-sizing:content] min-w-[5rem]",
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
        selected={selectedParts ? { ...selectedParts, day: 1 } : null}
        locale={locale}
        labels={labels}
        selectionMode="month"
        onViewChange={setView}
        onFocusChange={setFocus}
        onSelectDay={() => undefined}
        onSelectMonth={handleSelectMonth}
      />
    </Popover>
  );
}

export function MonthYearPicker(props: MonthYearPickerProps) {
  const preferNative = usePreferNativePickers();

  if (preferNative) {
    return <MonthYearPickerNative {...props} />;
  }

  return <MonthYearPickerPopover {...props} />;
}
