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

type DatePickerCalendarDensity = "compact" | "comfortable";

interface DatePickerCalendarProps {
  readonly view: CalendarView;
  readonly focus: CalendarDateParts;
  readonly selected: CalendarDateParts | null;
  readonly locale: string;
  readonly labels: DatePickerLabels;
  readonly selectionMode?: "day" | "month" | "year";
  readonly density?: DatePickerCalendarDensity;
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
  density = "compact",
  onViewChange,
  onFocusChange,
  onSelectDay,
  onSelectMonth,
  onSelectYear,
}: DatePickerCalendarProps) {
  const comfortable = density === "comfortable";
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

  const cellClass = cn(
    "hover:bg-accent rounded-md transition-colors",
    comfortable
      ? "min-h-11 px-2 py-2.5 text-sm font-medium"
      : "px-1.5 py-1.5 text-xs",
  );

  const dayCellClass = cn(
    "hover:bg-accent rounded-md transition-colors",
    comfortable
      ? "flex min-h-11 items-center justify-center text-sm font-medium"
      : "px-0.5 py-1 text-xs",
  );

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col",
        comfortable ? "w-full gap-3" : "w-64 gap-2",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <IconButton
          size={comfortable ? "md" : "sm"}
          label={labels.previous ?? "Previous"}
          onClick={handlePrevious}
        >
          <ChevronLeft className={comfortable ? "size-5" : "size-4"} />
        </IconButton>

        {view === "day" ? (
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              comfortable ? "text-sm" : "text-xs",
            )}
          >
            <button
              type="button"
              className={cn(
                "hover:text-primary transition-colors",
                comfortable && "min-h-11 px-2",
              )}
              onClick={() => onViewChange("month")}
            >
              {monthLabels[focus.month]}
            </button>
            <button
              type="button"
              className={cn(
                "hover:text-primary transition-colors",
                comfortable && "min-h-11 px-2",
              )}
              onClick={() => onViewChange("year")}
            >
              {focus.year}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              "font-semibold hover:text-primary transition-colors",
              comfortable ? "min-h-11 px-2 text-sm" : "text-xs",
            )}
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
          size={comfortable ? "md" : "sm"}
          label={labels.next ?? "Next"}
          onClick={handleNext}
        >
          <ChevronRight className={comfortable ? "size-5" : "size-4"} />
        </IconButton>
      </div>

      {view === "year" ? (
        <div
          className={cn("grid grid-cols-3", comfortable ? "gap-2" : "gap-1.5")}
        >
          {yearPageYears.map((year) => (
            <button
              key={year}
              type="button"
              className={cn(
                cellClass,
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
        <div
          className={cn("grid grid-cols-3", comfortable ? "gap-2" : "gap-1.5")}
        >
          {monthLabels.map((label, month) => (
            <button
              key={label}
              type="button"
              className={cn(
                cellClass,
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
          <div
            className={cn(
              "text-muted-foreground grid grid-cols-7 text-center font-medium",
              comfortable ? "gap-1 text-xs" : "gap-0.5 text-[11px]",
            )}
          >
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div
            className={cn(
              "grid grid-cols-7",
              comfortable ? "gap-1" : "gap-0.5",
            )}
          >
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
                    dayCellClass,
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
