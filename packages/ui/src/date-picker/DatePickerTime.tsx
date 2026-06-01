import { useMemo } from "react";

import { cn } from "@repo/theme/utils";

import { DatePickerScrollColumn } from "./DatePickerScrollColumn.js";
import type { DatePickerLabels } from "./date-picker.types.js";
import {
  formatTimePreview,
  from12Hour,
  to12Hour,
} from "./date-picker.utils.js";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const PERIODS = ["am", "pm"] as const;

type Period = (typeof PERIODS)[number];

interface DatePickerTimeProps {
  readonly hour: number;
  readonly minute: number;
  readonly labels: DatePickerLabels;
  readonly locale?: string;
  readonly onHourChange: (hour: number) => void;
  readonly onMinuteChange: (minute: number) => void;
  readonly className?: string;
}

export function DatePickerTime({
  hour,
  minute,
  labels,
  locale = "en",
  onHourChange,
  onMinuteChange,
  className,
}: DatePickerTimeProps) {
  const { hour12, isPm } = to12Hour(hour);
  const period: Period = isPm ? "pm" : "am";
  const preview = formatTimePreview(hour, minute, locale);

  const periodLabels = useMemo<Record<Period, string>>(
    () => ({
      am: labels.am ?? "AM",
      pm: labels.pm ?? "PM",
    }),
    [labels.am, labels.pm],
  );

  return (
    <div
      className={cn("flex w-36 shrink-0 flex-col gap-1.5", className)}
      aria-label={labels.selectTime ?? "Select time"}
    >
      <div
        className="text-foreground border-border bg-muted/40 rounded-md border px-2 py-1 text-center text-xs font-semibold tabular-nums"
        aria-live="polite"
      >
        {preview}
      </div>

      <div className="flex gap-1">
        <DatePickerScrollColumn
          values={HOURS}
          selected={hour12}
          onSelect={(value) => onHourChange(from12Hour(value, isPm))}
          formatValue={(value) => String(value)}
          ariaLabel={labels.hour ?? "Hour"}
        />
        <DatePickerScrollColumn
          values={MINUTES}
          selected={minute}
          onSelect={onMinuteChange}
          formatValue={(value) => String(value).padStart(2, "0")}
          ariaLabel={labels.minute ?? "Minute"}
        />
        <DatePickerScrollColumn
          values={PERIODS}
          selected={period}
          onSelect={(value) => onHourChange(from12Hour(hour12, value === "pm"))}
          formatValue={(value) => periodLabels[value]}
          ariaLabel={labels.hour ?? "Hour period"}
        />
      </div>
    </div>
  );
}
