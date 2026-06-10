import { describe, expect, it } from "vitest";

import {
  buildIsoForMode,
  formatPickerDisplayValue,
  formatTimePreview,
  from12Hour,
  getCalendarDayCells,
  getMonthLabels,
  getWeekdayLabels,
  getYearPageStart,
  getYearPageYears,
  parseIsoToUtcParts,
  resolvePickerParts,
  to12Hour,
} from "./date-picker.utils.js";

describe("date-picker.utils", () => {
  it("stores date-only values at UTC midnight", () => {
    expect(
      buildIsoForMode("date", {
        year: 2025,
        month: 2,
        day: 15,
        hour: 13,
        minute: 45,
      }),
    ).toBe("2025-03-15T00:00:00.000Z");
  });

  it("stores datetime values with UTC time", () => {
    expect(
      buildIsoForMode("datetime", {
        year: 2025,
        month: 2,
        day: 15,
        hour: 14,
        minute: 30,
      }),
    ).toBe("2025-03-15T14:30:00.000Z");
  });

  it("stores time-only values on the reference date", () => {
    expect(
      buildIsoForMode("time", {
        year: 2025,
        month: 0,
        day: 1,
        hour: 9,
        minute: 15,
      }),
    ).toBe("1970-01-01T09:15:00.000Z");
  });

  it("parses ISO values into UTC parts", () => {
    expect(parseIsoToUtcParts("2025-03-15T14:30:00.000Z")).toEqual({
      year: 2025,
      month: 2,
      day: 15,
      hour: 14,
      minute: 30,
    });
  });

  it("formats display values per mode", () => {
    expect(
      formatPickerDisplayValue("date", "2025-03-15T00:00:00.000Z", "en", "UTC"),
    ).toMatch(/03/);
    expect(
      formatPickerDisplayValue("time", "1970-01-01T14:30:00.000Z", "en", "UTC"),
    ).toMatch(/2:30/);
  });

  it("resolves time-only parts from an ISO value", () => {
    expect(resolvePickerParts("time", "1970-01-01T09:05:00.000Z")).toEqual({
      year: 1970,
      month: 0,
      day: 1,
      hour: 9,
      minute: 5,
    });
  });

  it("pages years in groups of twelve", () => {
    expect(getYearPageStart(2025)).toBe(2016);
    expect(getYearPageYears(2016)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ]);
  });

  it("builds a six-week calendar grid", () => {
    expect(getCalendarDayCells(2025, 2)).toHaveLength(42);
  });

  it("aligns month labels with 0-indexed UTC month indices", () => {
    const labels = getMonthLabels("en");
    const utcFormatter = new Intl.DateTimeFormat("en", {
      month: "short",
      timeZone: "UTC",
    });

    for (let month = 0; month < 12; month += 1) {
      expect(labels[month]).toBe(
        utcFormatter.format(new Date(Date.UTC(2024, month, 1))),
      );
    }
  });

  it("aligns weekday labels with the UTC calendar grid", () => {
    const labels = getWeekdayLabels("en");
    const utcFormatter = new Intl.DateTimeFormat("en", {
      weekday: "short",
      timeZone: "UTC",
    });
    const base = Date.UTC(2024, 0, 7);

    for (let index = 0; index < 7; index += 1) {
      expect(labels[index]).toBe(
        utcFormatter.format(new Date(base + index * 86_400_000)),
      );
    }
  });

  it("converts between 12-hour and 24-hour time", () => {
    expect(to12Hour(0)).toEqual({ hour12: 12, isPm: false });
    expect(to12Hour(13)).toEqual({ hour12: 1, isPm: true });
    expect(from12Hour(12, false)).toBe(0);
    expect(from12Hour(1, true)).toBe(13);
  });

  it("formats a live time preview", () => {
    expect(formatTimePreview(14, 30, "en")).toMatch(/2:30/);
    expect(formatTimePreview(9, 5, "en")).toMatch(/9:05/);
  });
});
