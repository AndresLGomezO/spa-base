import { Calendar } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";

import { cn } from "@repo/theme/utils";

import { Input } from "../input/Input.js";
import { usePreferNativePickers } from "../hooks/usePreferNativePickers.js";
import { Popover } from "../popover/Popover.js";
import { BottomSheet } from "../sheet/BottomSheet.js";
import { DatePickerCalendar } from "./DatePickerCalendar.js";
import { DatePickerPresets } from "./DatePickerPresets.js";
import type {
  CalendarDateParts,
  CalendarView,
  DatePickerLabels,
  DatePickerPreset,
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
  readonly presets?: readonly DatePickerPreset[];
}

function YearPickerPanel({
  value,
  onChange,
  locale,
  labels,
  density,
  presets,
  onClose,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly locale: string;
  readonly labels: DatePickerLabels;
  readonly density: "compact" | "comfortable";
  readonly presets?: readonly DatePickerPreset[];
  readonly onClose: () => void;
}) {
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
    setView("year");
  }, [value]);

  const selectedParts = parseYearBucket(value);

  function handleSelectYear(parts: Pick<CalendarDateParts, "year">) {
    onChange(formatYearBucket(parts.year));
    onClose();
  }

  function handlePreset(next: string) {
    onChange(next);
    onClose();
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        density === "comfortable" ? "gap-3" : "gap-1.5",
      )}
    >
      {presets && presets.length > 0 ? (
        <DatePickerPresets
          presets={presets}
          selectedValue={value}
          onSelect={handlePreset}
        />
      ) : null}
      <DatePickerCalendar
        view={view}
        focus={focus}
        selected={selectedParts ? { ...selectedParts, month: 0, day: 1 } : null}
        locale={locale}
        labels={labels}
        selectionMode="year"
        density={density}
        onViewChange={setView}
        onFocusChange={setFocus}
        onSelectDay={() => undefined}
        onSelectYear={handleSelectYear}
      />
    </div>
  );
}

function YearPickerTrigger({
  id,
  disabled,
  hasError,
  displayValue,
  placeholder,
  labels,
  compact,
  canClear,
  onClear,
  clearAriaLabel,
  inputClassName,
  inputStyle,
  className,
  ...triggerProps
}: {
  readonly id?: string;
  readonly disabled: boolean;
  readonly hasError: boolean;
  readonly displayValue: string;
  readonly placeholder?: string;
  readonly labels: DatePickerLabels;
  readonly compact: boolean;
  readonly canClear: boolean;
  readonly onClear?: () => void;
  readonly clearAriaLabel?: string;
  readonly inputClassName?: string;
  readonly inputStyle?: CSSProperties;
  readonly className?: string;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...triggerProps}
      className={cn(
        "relative",
        compact ? "inline-block w-fit" : "w-full",
        className,
      )}
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
  );
}

function YearPickerPopover(props: YearPickerProps) {
  const {
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
    presets,
  } = props;
  const canClear = showClearButton && onClear !== undefined;
  const [open, setOpen] = useState(false);
  const displayValue = formatYearBucketDisplay(value, locale);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) {
      setOpen(nextOpen);
    }
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
        <YearPickerTrigger
          id={id}
          disabled={disabled}
          hasError={hasError}
          displayValue={displayValue}
          placeholder={placeholder}
          labels={labels}
          compact={compact}
          canClear={canClear}
          onClear={onClear}
          clearAriaLabel={clearAriaLabel}
          inputClassName={inputClassName}
          inputStyle={inputStyle}
        />
      }
    >
      <YearPickerPanel
        value={value}
        onChange={onChange}
        locale={locale}
        labels={labels}
        density="compact"
        presets={presets}
        onClose={() => setOpen(false)}
      />
    </Popover>
  );
}

function YearPickerSheet(props: YearPickerProps) {
  const {
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
    presets,
  } = props;
  const canClear = showClearButton && onClear !== undefined;
  const [open, setOpen] = useState(false);
  const displayValue = formatYearBucketDisplay(value, locale);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) {
      setOpen(nextOpen);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labels.openCalendar ?? "Open date picker"}
        className={cn(disabled && "pointer-events-none")}
        onClick={() => handleOpenChange(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpenChange(true);
          }
        }}
      >
        <YearPickerTrigger
          id={id}
          disabled={disabled}
          hasError={hasError}
          displayValue={displayValue}
          placeholder={placeholder}
          labels={labels}
          compact={compact}
          canClear={canClear}
          onClear={onClear}
          clearAriaLabel={clearAriaLabel}
          inputClassName={inputClassName}
          inputStyle={inputStyle}
          className={className}
        />
      </div>
      <BottomSheet
        open={open}
        onOpenChange={handleOpenChange}
        title={labels.selectYear ?? labels.openCalendar}
      >
        <YearPickerPanel
          value={value}
          onChange={onChange}
          locale={locale}
          labels={labels}
          density="comfortable"
          presets={presets}
          onClose={() => setOpen(false)}
        />
      </BottomSheet>
    </>
  );
}

export function YearPicker(props: YearPickerProps) {
  const preferSheet = usePreferNativePickers();

  if (preferSheet) {
    return <YearPickerSheet {...props} />;
  }

  return <YearPickerPopover {...props} />;
}
