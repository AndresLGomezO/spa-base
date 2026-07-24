import { Calendar } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button.js";
import { usePreferNativePickers } from "../hooks/usePreferNativePickers.js";
import { Input } from "../input/Input.js";
import { Popover } from "../popover/Popover.js";
import { BottomSheet } from "../sheet/BottomSheet.js";
import { DatePickerCalendar } from "./DatePickerCalendar.js";
import { DatePickerPresets } from "./DatePickerPresets.js";
import { DatePickerTime } from "./DatePickerTime.js";
import type {
  CalendarDateParts,
  CalendarView,
  DatePickerLabels,
  DatePickerMode,
  DatePickerPreset,
} from "./date-picker.types.js";
import {
  buildIsoForMode,
  formatPickerDisplayValue,
  resolvePickerParts,
} from "./date-picker.utils.js";
import {
  DatePickerFieldClearButton,
  datePickerCompactInputPadding,
} from "./DatePickerFieldClearButton.js";

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
  readonly inputClassName?: string;
  readonly inputStyle?: CSSProperties;
  readonly compact?: boolean;
  readonly showClearButton?: boolean;
  readonly onClear?: () => void;
  readonly clearAriaLabel?: string;
  readonly presets?: readonly DatePickerPreset[];
}

function DatePickerPanel({
  mode,
  value,
  onChange,
  locale,
  labels,
  density,
  presets,
  onClose,
}: {
  readonly mode: DatePickerMode;
  readonly value?: string | null;
  readonly onChange: (value: string | undefined) => void;
  readonly locale: string;
  readonly labels: DatePickerLabels;
  readonly density: "compact" | "comfortable";
  readonly presets?: readonly DatePickerPreset[];
  readonly onClose: () => void;
}) {
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
    setView("day");
  }, [value]);

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
      onClose();
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

  function handlePreset(next: string) {
    onChange(next);
    onClose();
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

  return (
    <div
      className={cn(
        "flex flex-col",
        density === "comfortable" ? "gap-3" : "gap-1.5",
      )}
    >
      {presets && presets.length > 0 && mode === "date" ? (
        <DatePickerPresets
          presets={presets}
          selectedValue={value}
          onSelect={handlePreset}
        />
      ) : null}

      {mode !== "time" ? (
        <div className="flex items-stretch gap-2">
          <DatePickerCalendar
            view={view}
            focus={focus}
            selected={selectedDate}
            locale={locale}
            labels={labels}
            density={density}
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
              onClose();
            }}
          >
            {labels.clear ?? "Clear"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DatePickerTrigger({
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
      className={cn("relative", compact ? "inline-block w-fit" : "w-full", className)}
    >
      <Input
        id={id}
        readOnly
        disabled={disabled}
        hasError={hasError}
        value={displayValue}
        placeholder={placeholder ?? labels.placeholder ?? "Select date"}
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
  );
}

function DatePickerPopover(props: DatePickerProps) {
  const {
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
  const displayValue = formatPickerDisplayValue(mode, value, locale, timeZone);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) {
      setOpen(nextOpen);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      fullWidth={!compact}
      layer="elevated"
      placement="bottom-start"
      className={cn(compact && "w-fit", className)}
      panelClassName="w-auto p-2 [&>div]:gap-1.5"
      trigger={
        <DatePickerTrigger
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
      <DatePickerPanel
        mode={mode}
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

function DatePickerSheet(props: DatePickerProps) {
  const {
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
  const displayValue = formatPickerDisplayValue(mode, value, locale, timeZone);

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
        <DatePickerTrigger
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
        title={labels.openCalendar}
      >
        <DatePickerPanel
          mode={mode}
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

export function DatePicker(props: DatePickerProps) {
  const preferSheet = usePreferNativePickers();

  if (preferSheet) {
    return <DatePickerSheet {...props} />;
  }

  return <DatePickerPopover {...props} />;
}
