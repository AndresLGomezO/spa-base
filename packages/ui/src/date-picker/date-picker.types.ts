export type DatePickerMode = "date" | "datetime" | "time";

export type CalendarView = "year" | "month" | "day";

export interface DatePickerPreset {
  readonly label: string;
  readonly value: string;
}

export interface DatePickerLabels {
  readonly placeholder?: string;
  readonly clear?: string;
  readonly previous?: string;
  readonly next?: string;
  readonly selectYear?: string;
  readonly selectMonth?: string;
  readonly am?: string;
  readonly pm?: string;
  readonly hour?: string;
  readonly minute?: string;
  readonly selectTime?: string;
  readonly openCalendar?: string;
}

export interface CalendarDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface TimeParts {
  readonly hour: number;
  readonly minute: number;
}
