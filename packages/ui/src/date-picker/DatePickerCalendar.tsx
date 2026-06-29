import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton.js";
import type {
  CalendarDateParts,
  CalendarView,
  DatePickerLabels,
} from "./date-picker.types.js";
import {
  formatMonthYearLabel,
  getCalendarDayCells,
  getMonthLabels,
  getWeekdayLabels,
  getYearPageStart,
  getYearPageYears,
  shiftMonth,
} from "./date-picker.utils.js";

interface DatePickerCalendarProps {
  readonly view: CalendarView;
  readonly focus: CalendarDateParts;
  readonly selected: CalendarDateParts | null;
  readonly locale: string;
  readonly labels: DatePickerLabels;
  readonly selectionMode?: "day" | "month" | "year";
  readonly onViewChange: (view: CalendarView) => void;
  readonly onFocusChange: (focus: CalendarDateParts) => void;
  readonly onSelectDay: (parts: CalendarDateParts) => void;
  readonly onSelectMonth?: (
    parts: Pick<CalendarDateParts, "year" | "month">,
  ) => void;
  readonly onSelectYear?: (parts: Pick<CalendarDateParts, "year">) => void;
}

export function DatePickerCalendar({
  view,
  focus,
  selected,
  locale,
  labels,
  selectionMode = "day",
  onViewChange,
  onFocusChange,
  onSelectDay,
  onSelectMonth,
  onSelectYear,
}: DatePickerCalendarProps) {
  const yearPageStart = getYearPageStart(focus.year);
  const yearPageYears = getYearPageYears(yearPageStart);
  const monthLabels = getMonthLabels(locale);
  const weekdayLabels = getWeekdayLabels(locale);
  const dayCells = getCalendarDayCells(focus.year, focus.month);

  function handlePrevious() {
    if (view === "year") {
      onFocusChange({ ...focus, year: focus.year - 12 });
      return;
    }
    if (view === "month") {
      onFocusChange({ ...focus, year: focus.year - 1 });
      return;
    }
    const shifted = shiftMonth(focus.year, focus.month, -1);
    onFocusChange({ ...shifted, day: focus.day });
  }

  function handleNext() {
    if (view === "year") {
      onFocusChange({ ...focus, year: focus.year + 12 });
      return;
    }
    if (view === "month") {
      onFocusChange({ ...focus, year: focus.year + 1 });
      return;
    }
    const shifted = shiftMonth(focus.year, focus.month, 1);
    onFocusChange({ ...shifted, day: focus.day });
  }

  const headerLabel =
    view === "year"
      ? `${yearPageStart} – ${yearPageStart + 11}`
      : view === "month"
        ? String(focus.year)
        : formatMonthYearLabel(focus.year, focus.month, locale);

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <IconButton
          size="sm"
          label={labels.previous ?? "Previous"}
          onClick={handlePrevious}
        >
          <ChevronLeft className="size-4" />
        </IconButton>

        {view === "day" ? (
          <div className="flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              className="hover:text-primary transition-colors"
              onClick={() => onViewChange("month")}
            >
              {monthLabels[focus.month]}
            </button>
            <button
              type="button"
              className="hover:text-primary transition-colors"
              onClick={() => onViewChange("year")}
            >
              {focus.year}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-xs font-semibold hover:text-primary transition-colors"
            onClick={() => {
              if (view === "month") {
                onViewChange("year");
              }
            }}
          >
            {headerLabel}
          </button>
        )}

        <IconButton
          size="sm"
          label={labels.next ?? "Next"}
          onClick={handleNext}
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>

      {view === "year" ? (
        <div className="grid grid-cols-3 gap-1.5">
          {yearPageYears.map((year) => (
            <button
              key={year}
              type="button"
              className={cn(
                "hover:bg-accent rounded-md px-1.5 py-1.5 text-xs transition-colors",
                year === focus.year &&
                  "bg-primary text-primary-foreground hover:bg-primary",
              )}
              onClick={() => {
                onFocusChange({ ...focus, year });
                if (selectionMode === "year") {
                  onSelectYear?.({ year });
                  return;
                }
                onViewChange("month");
              }}
            >
              {year}
            </button>
          ))}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="grid grid-cols-3 gap-1.5">
          {monthLabels.map((label, month) => (
            <button
              key={label}
              type="button"
              className={cn(
                "hover:bg-accent rounded-md px-1.5 py-1.5 text-xs transition-colors",
                month === focus.month &&
                  "bg-primary text-primary-foreground hover:bg-primary",
              )}
              onClick={() => {
                const nextFocus = { ...focus, month };
                onFocusChange(nextFocus);
                if (selectionMode === "month") {
                  onSelectMonth?.({ year: nextFocus.year, month });
                  return;
                }
                onViewChange("day");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {view === "day" ? (
        <>
          <div className="text-muted-foreground grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {dayCells.map((cell) => {
              const isSelected =
                selected?.year === cell.year &&
                selected?.month === cell.month &&
                selected?.day === cell.day;

              return (
                <button
                  key={`${cell.year}-${cell.month}-${cell.day}`}
                  type="button"
                  className={cn(
                    "hover:bg-accent rounded-md px-0.5 py-1 text-xs transition-colors",
                    !cell.inCurrentMonth && "text-muted-foreground/60",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  onClick={() =>
                    onSelectDay({
                      year: cell.year,
                      month: cell.month,
                      day: cell.day,
                    })
                  }
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
